import { api, useQuery, type Couple, type Profile } from "@/data";

export type Gate = "loading" | "signed_out" | "needs_profile" | "needs_partner" | "ready";

/** Où en est la personne : connexion, profil, appairage. Décide de l'écran de départ.
 *  « needs_partner » n'est pas bloquant : on peut visiter l'app avant d'inviter son/sa partenaire. */
export function useGate() {
  const q = useQuery(async (): Promise<{ gate: Gate; profile?: Profile; couple?: Couple | null; partner?: Profile }> => {
    const session = await api.getSession();
    if (!session) return { gate: "signed_out" };
    const profile = await api.getMyProfile();
    if (!profile.display_name) return { gate: "needs_profile", profile };
    const [couple, partner] = await Promise.all([api.getCouple(), api.getPartner()]);
    if (!couple || !partner) return { gate: "needs_partner", profile, couple };
    return { gate: "ready", profile, couple, partner };
  });
  const gate: Gate = q.loading && !q.data ? "loading" : q.data?.gate ?? "loading";
  return { ...q.data, gate, paired: gate === "ready", refetch: q.refetch };
}

export const GATE_HREF = {
  signed_out: "/welcome",
  needs_profile: "/onboarding/profile",
  needs_partner: "/home", // on visite d'abord, l'invitation se fait depuis l'accueil
  ready: "/home",
} as const;
