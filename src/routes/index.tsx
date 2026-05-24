import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAssinatura } from "@/lib/use-assinatura";
import { ApresentacaoPage } from "./apresentacao";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Roleta Corretor | Simulador Corretor Elite 4.0" },
      {
        name: "description",
        content:
          "Do caos do sorteio à fila justa automática. Auto-atendimento por QR Code, escala digital e roleta transparente para incorporadoras e stands de vendas.",
      },
      { property: "og:title", content: "Roleta Corretor — Elite 4.0" },
      {
        property: "og:description",
        content:
          "Conheça o Ecossistema 4.0: QR Code na recepção, WhatsApp do corretor e fila justa em tempo real.",
      },
    ],
  }),
});

function Landing() {
  const assinatura = useAssinatura();

  // Assinante ativo (fora da janela de renovação) vai direto pro painel.
  if (!assinatura.loading && assinatura.status === "ativa") {
    return <Navigate to="/app" />;
  }

  // Página inicial = Apresentação do Ecossistema 4.0.
  return <ApresentacaoPage />;
}
