export type ReviewTarget = "store" | "product" | "courier";
export function canReviewOrder(status: string): boolean { return status === "Entregue"; }
export function validateReviewRating(rating: number): void { if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Avaliação deve estar entre 1 e 5"); }
export function validateReviewTarget(target: ReviewTarget): void { if (!["store", "product", "courier"].includes(target)) throw new Error("Destino de avaliação inválido"); }
