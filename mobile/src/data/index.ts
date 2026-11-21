// Point d'entrée unique de la couche de données. replica-backend remplacera `./fake` par `./supabase`
// avec les mêmes exports : aucun écran ne change.
export * as api from "./fake";
export * from "./types";
export { useQuery, useMutation } from "./hooks";
