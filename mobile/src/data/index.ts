// Point d'entrée unique de la couche de données.
// Avec EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_KEY définis : vraie base Supabase.
// Sans : couche factice en mémoire, avec les boutons de simulation du/de la partenaire.
export { api, USING_SUPABASE } from "./api";
export * from "./types";
export type { DesireRow, QuizRow } from "./fake";
export { useQuery, useMutation } from "./hooks";
