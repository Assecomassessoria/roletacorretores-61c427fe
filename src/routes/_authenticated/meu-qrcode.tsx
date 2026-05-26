import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meu-qrcode")({
  component: MeuQRCodePage,
  head: () => ({ meta: [{ title: "Meu QR Code — Roleta Corretor" }] }),
});

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function MeuQRCodePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [creci, setCreci] = useState<string | null>(null);
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("Olá! Vim pelo seu QR Code, gostaria de mais informações.");
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("corretores")
        .select("nome,creci,telefone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setNome(data.nome);
        setCreci(data.creci);
        setTelefone(data.telefone ?? "");
      }
      setLoading(false);
    })();
  }, [user]);

  const waUrl = useMemo(() => {
    const numero = onlyDigits(telefone);
    if (!numero) return "";
    const numeroBR = numero.length <= 11 ? `55${numero}` : numero;
    const txt = encodeURIComponent(mensagem);
    return `https://wa.me/${numeroBR}?text=${txt}`;
  }, [telefone, mensagem]);

  function baixarPNG() {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 1024;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = `qrcode-${nome.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${svg64}`;
  }

  if (loading) return <main className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted-foreground">Carregando…</main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold print:hidden">Meu QR Code</h1>
      <p className="mt-1 text-sm text-muted-foreground print:hidden">
        O cliente aponta a câmera no QR e abre uma conversa de WhatsApp direto com você.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-6 print:hidden">
          <Label htmlFor="tel">WhatsApp</Label>
          <Input id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          <p className="mt-1 text-xs text-muted-foreground">
            Para alterar de forma permanente, vá em <Link to="/meu-cadastro" className="text-orange hover:underline">Meu Cadastro</Link>.
          </p>

          <div className="mt-4">
            <Label htmlFor="msg">Mensagem inicial (opcional)</Label>
            <Input id="msg" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={baixarPNG} disabled={!waUrl}>
              <Download className="mr-2 h-4 w-4" /> Baixar PNG
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!waUrl}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </div>
        </section>

        <section className="flex flex-col items-center justify-center rounded-lg border border-border bg-white p-6 text-center text-black print:border-0">
          {waUrl ? (
            <>
              <div ref={svgRef}>
                <QRCodeSVG value={waUrl} size={240} level="M" includeMargin />
              </div>
              <p className="mt-4 text-lg font-bold">{nome}</p>
              {creci && <p className="text-sm">CRECI {creci}</p>}
              <p className="mt-1 text-xs text-neutral-600">Aponte a câmera para falar comigo no WhatsApp</p>
            </>
          ) : (
            <p className="text-sm text-neutral-600">Informe seu WhatsApp para gerar o QR.</p>
          )}
        </section>
      </div>
    </main>
  );
}
