import { useCallback, useEffect, useRef, useState } from "react";
import { api, USING_SUPABASE } from "./api";
import { DataError } from "./types";

type QueryState<T> = { data: T | undefined; loading: boolean; error: Error | null };

/** Lit une donnée et la relit à chaque changement poussé en temps réel. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<QueryState<T>>({ data: undefined, loading: true, error: null });
  const fnRef = useRef(fn); fnRef.current = fn;
  const alive = useRef(true);

  const run = useCallback(() => {
    fnRef.current()
      .then((data) => alive.current && setState({ data, loading: false, error: null }))
      .catch((error: Error) => alive.current && setState((s) => ({ ...s, loading: false, error })));
  }, []);

  useEffect(() => {
    alive.current = true;
    setState((s) => ({ ...s, loading: true }));
    run();
    const off = api.subscribe(run);
    // Filet de sécurité avec la vraie base : certains changements du partenaire ne nous sont
    // pas diffusés tant que la règle de révélation les cache (ex. il/elle vient de répondre).
    const poll = USING_SUPABASE ? setInterval(run, 15000) : null;
    return () => { alive.current = false; off(); if (poll) clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch: run };
}

/** Lance une écriture : état d'envoi et message d'erreur lisible. */
export function useMutation<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutate = useCallback(async (...a: A) => {
    setPending(true); setError(null);
    try { return await fn(...a); }
    catch (e) { setError(errorMessage(e)); return undefined; }
    finally { setPending(false); }
  }, [fn]);
  return { mutate, pending, error, setError };
}

const MESSAGES: Record<string, string> = {
  already_paired: "Tu es déjà lié·e à quelqu'un.",
  invalid_or_expired_code: "Ce code n'existe pas ou a expiré. Demande un nouveau code.",
  couple_full: "Ce duo est déjà complet.",
  not_paired: "Il faut d'abord inviter ton/ta partenaire.",
  not_signed_in: "Ta session a expiré. Reconnecte-toi.",
  invalid_email: "Cet email n'a pas l'air complet.",
  underage: "HotCouple est réservé aux personnes majeures.",
  already_answered: "Tu as déjà répondu à celle-ci.",
  not_your_turn: "Ce n'est pas encore ton tour.",
  invalid_move: "Ce coup n'est pas possible.",
  stale_game: "La partie a bougé entre-temps. Regarde le plateau et rejoue.",
  premium_required: "Réservé à Premium.",
  quiz_closed: "Ce quiz est terminé. De nouvelles questions arrivent demain.",
  game_in_progress: "Une partie est déjà en cours. Finissez-la avant d'en lancer une autre.",
  invalid_date: "Cette date n'est pas valide.",
  invalid_credentials: "Email ou mot de passe incorrect.",
  weak_password: "8 caractères minimum pour le mot de passe.",
  email_taken: "Un compte existe déjà avec cet email. Connecte-toi plutôt.",
  signup_disabled: "Les inscriptions sont fermées sur cette version privée.",
  confirm_email: "Compte créé. Confirme ton email avant de te connecter.",
};

export function errorMessage(e: unknown) {
  if (e instanceof DataError) return MESSAGES[e.code] ?? "Une erreur est survenue.";
  return "Pas de connexion. Réessaie dans un instant.";
}
