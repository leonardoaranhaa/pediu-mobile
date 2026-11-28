import { boundingSpanKm, geocodeRejection } from "@/shared/address-pin";

export type CepPlace = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
};

export type PlacedAddress = {
  line: string;
  pin: { latitude: number; longitude: number };
  cep: CepPlace;
};

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export async function lookupCep(rawCep: string): Promise<CepPlace | null> {
  const cep = digits(rawCep);
  if (cep.length !== 8) return null;
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const body = (await response.json()) as {
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        location?: { coordinates?: { latitude?: number; longitude?: number } };
      };
      return {
        cep,
        street: body.street ?? "",
        neighborhood: body.neighborhood ?? "",
        city: body.city ?? "",
        state: body.state ?? "",
        latitude: body.location?.coordinates?.latitude ?? null,
        longitude: body.location?.coordinates?.longitude ?? null,
      };
    }
  } catch {
    // Try the other free lookup below.
  }
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) return null;
    const body = (await response.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (body.erro || !body.localidade) return null;
    return {
      cep,
      street: body.logradouro ?? "",
      neighborhood: body.bairro ?? "",
      city: body.localidade,
      state: body.uf ?? "",
      latitude: null,
      longitude: null,
    };
  } catch {
    return null;
  }
}

type NominatimRow = {
  lat?: string;
  lon?: string;
  type?: string;
  addresstype?: string;
  boundingbox?: string[];
  address?: { road?: string };
};

async function geocodeNominatim(query: string): Promise<NominatimRow | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Pediu/1.0 (aplicativo de entrega local)",
      },
    },
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as NominatimRow[];
  return rows[0] ?? null;
}

export async function placeAddressOnMap(input: {
  cep: string;
  number: string;
  city?: string;
}): Promise<{ ok: true; placed: PlacedAddress } | { ok: false; message: string }> {
  const number = input.number.trim();
  if (digits(input.cep).length !== 8 || number.length < 1) {
    return { ok: false, message: "Informe o CEP com 8 números e o número da porta." };
  }
  const found = await lookupCep(input.cep);
  if (!found || !found.city) {
    return { ok: false, message: "Não encontramos esse CEP. Confira os números." };
  }
  if (input.city?.trim() && input.city.trim().toLowerCase() !== found.city.toLowerCase()) {
    return {
      ok: false,
      message: `Esse CEP é de ${found.city}. Confira a cidade.`,
    };
  }
  const line = [
    found.street,
    number,
    found.neighborhood,
    found.city,
    found.state,
    found.cep,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
  let row: NominatimRow | null = null;
  try {
    row = await geocodeNominatim(line);
  } catch {
    row = null;
  }
  const latitude = Number(row?.lat);
  const longitude = Number(row?.lon);
  if (!row || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, message: "Não achamos esse endereço no mapa. Confira o CEP e o número." };
  }
  const box = row.boundingbox?.map(Number) ?? [];
  const span =
    box.length === 4 && box.every((value) => Number.isFinite(value))
      ? boundingSpanKm({ south: box[0], north: box[1], west: box[2], east: box[3] })
      : null;
  const rejection = geocodeRejection(
    {
      latitude,
      longitude,
      type: row.type,
      addressType: row.addresstype,
      road: row.address?.road,
      boundingSpanKm: span,
    },
    { latitude: found.latitude, longitude: found.longitude },
  );
  if (rejection) return { ok: false, message: rejection };
  return {
    ok: true,
    placed: {
      line,
      pin: { latitude, longitude },
      cep: found,
    },
  };
}
