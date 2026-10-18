import { ProfileHome } from "@/components/profile-home";
import { Page } from "@/components/pediu-page";

export default function ProfilePage() {
  return (
    <Page title="Perfil" eyebrow="SUA CONTA">
      <ProfileHome />
    </Page>
  );
}
