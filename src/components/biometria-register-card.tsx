import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Fingerprint, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startRegistration as srvStart, finishRegistration as srvFinish } from "@/lib/webauthn.functions";

type Props = {
  /** Callback opcional disparado quando o usuário avança (ok ou pular). */
  onDone?: () => void;
  /** Rótulo do dispositivo (ex.: "iPhone do Pedro") */
  defaultLabel?: string;
};

export function BiometriaRegisterCard({ onDone, defaultLabel }: Props) {
  const start = useServerFn(srvStart);
  const finish = useServerFn(srvFinish);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [label, setLabel] = useState(defaultLabel ?? "");

  async function registrar() {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      toast.error("Este dispositivo/navegador não suporta biometria (WebAuthn).");
      return;
    }
    setBusy(true);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const options = await start({});
      // @ts-expect-error simplewebauthn options shape
      const response = await startRegistration({ optionsJSON: options });
      await finish({ data: { response, device_label: label || null } });
      setOk(true);
      toast.success("Biometria cadastrada neste dispositivo!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao cadastrar biometria";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (ok) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/5 p-5 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" />
        <p className="text-sm font-medium text-foreground">Biometria ativada neste dispositivo.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Você poderá validar sua presença usando digital ou Face ID em /plantao.
        </p>
        {onDone && (
          <Button onClick={onDone} className="mt-4 bg-[var(--navy-deep,#0b1e3f)] text-white hover:opacity-90">
            Continuar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[var(--navy-deep,#0b1e3f)]/10 p-2 text-[var(--navy-deep,#0b1e3f)]">
          <Fingerprint className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Cadastrar biometria neste dispositivo</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Use digital ou Face ID para confirmar presença em /plantao sem precisar digitar a senha.
          </p>
        </div>
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Apelido do dispositivo (ex.: iPhone do Pedro)"
        maxLength={80}
        className="mt-3 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={registrar}
          disabled={busy}
          className="bg-[var(--navy-deep,#0b1e3f)] text-white hover:opacity-90"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
          Autenticar com Biometria
        </Button>
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
            Pular por agora
          </Button>
        )}
      </div>
    </div>
  );
}
