import { MessageCircle } from "lucide-react-native";
import { withPartner } from "@/components/app/PairGate";
import { Conversation } from "@/components/app/Conversation";

// Chat : la messagerie privée du couple, dans le dock
function Chat() { return <Conversation tab />; }

export default withPartner(Chat, { id: "S14", kicker: "Chat", title: "Rien que vous deux", body: "Votre conversation privée : mots doux, souvenirs, promesses pour ce soir.", example: "Hâte de te retrouver ce soir.", icon: MessageCircle }, { tabs: true });
