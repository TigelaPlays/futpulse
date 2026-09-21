import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { X, Upload, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssetUploadModal({ isOpen, onClose }: AssetUploadModalProps) {
  const [category, setCategory] = useState<"teams" | "leagues" | "stadiums">("teams");
  const [targetName, setTargetName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targets = useQuery(api.assets.listUploadTargets);
  const generateUploadUrl = useMutation(api.assets.generateUploadUrl);
  const linkTeamLogo = useMutation(api.assets.linkTeamLogo);
  const linkLeagueLogo = useMutation(api.assets.linkLeagueLogo);
  const linkStadiumImage = useMutation(api.assets.linkStadiumImage);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFeedback(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !targetName.trim()) {
      setFeedback({ type: "error", message: "Selecione uma imagem e o nome do destino." });
      return;
    }

    try {
      setIsUploading(true);
      setFeedback(null);

      // 1. Gera URL de upload segura do Convex File Storage
      const uploadUrl = await generateUploadUrl();

      // 2. Faz o envio do arquivo
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!response.ok) {
        throw new Error("Falha no upload para o servidor");
      }

      const { storageId } = await response.json();

      // 3. Vincula a imagem no banco
      if (category === "teams") {
        await linkTeamLogo({ teamName: targetName.trim(), storageId });
      } else if (category === "leagues") {
        await linkLeagueLogo({ leagueName: targetName.trim(), storageId });
      } else if (category === "stadiums") {
        await linkStadiumImage({ stadiumName: targetName.trim(), storageId });
      }

      setFeedback({
        type: "success",
        message: `Imagem vinculada com sucesso na CDN do Convex para "${targetName.trim()}"!`,
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Erro no upload:", err);
      setFeedback({
        type: "error",
        message: err.message || "Erro ao realizar upload do arquivo.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const currentList =
    category === "teams"
      ? targets?.teams
      : category === "leagues"
      ? targets?.leagues
      : targets?.stadiums;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Gerenciador de Ativos & Escudos (Convex CDN)
              </h2>
              <p className="text-[11px] text-slate-500">
                Armazenamento nativo do Convex com CDN global ultra rápida
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-5 space-y-4 text-xs">
          {/* Categoria */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Tipo de Ativo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "teams", label: "Escudo de Time" },
                  { id: "leagues", label: "Logo de Liga" },
                  { id: "stadiums", label: "Foto de Estádio" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setCategory(tab.id);
                    setTargetName("");
                  }}
                  className={`py-2 px-3 rounded-lg border font-semibold transition-all cursor-pointer text-center ${
                    category === tab.id
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nome / Seleção do Destino */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Nome do {category === "teams" ? "Time" : category === "leagues" ? "Campeonato" : "Estádio"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder={`Digite ou selecione (ex: ${category === "teams" ? "Vila Nova" : category === "leagues" ? "Brasileirão Série B" : "Maracanã"})...`}
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
              />

              {/* Sugestões rápidas */}
              {currentList && currentList.length > 0 && !targetName && (
                <div className="mt-2 max-h-28 overflow-y-auto no-scrollbar border border-slate-200 rounded-lg bg-slate-50 p-1.5 space-y-1">
                  <p className="text-[10px] text-slate-500 px-1 py-0.5 font-medium">Sugestões salvas no banco:</p>
                  <div className="flex flex-wrap gap-1">
                    {currentList.slice(0, 12).map((item: { id: string; name: string }) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTargetName(item.name)}
                        className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:text-white hover:bg-emerald-600 transition-colors shadow-2xs"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Área de Seleção de Arquivo */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Arquivo de Imagem (PNG, JPG, WEBP, SVG)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
              id="asset-file-input"
            />
            <label
              htmlFor="asset-file-input"
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/70 hover:bg-slate-50 transition-all"
            >
              {previewUrl ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs border border-slate-200">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 truncate max-w-[220px]">
                      {selectedFile?.name}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      {(selectedFile?.size ? selectedFile.size / 1024 : 0).toFixed(1)} KB • Clique para trocar
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                  <span className="text-slate-600 font-medium">
                    Clique para selecionar um arquivo do seu computador
                  </span>
                </>
              )}
            </label>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2 animate-fade-in ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Botão de Envio */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !targetName.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition-all cursor-pointer ${
                isUploading || !selectedFile || !targetName.trim()
                  ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-xs active:scale-95"
              }`}
            >
              <Upload className={`w-4 h-4 ${isUploading ? "animate-bounce" : ""}`} />
              <span>{isUploading ? "Enviando para o Convex..." : "Salvar no Convex CDN"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
