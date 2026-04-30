/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  MessageCircle, 
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  Sparkles,
  ShoppingBag,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

interface Product {
  id: string;
  marca: string;
  nome: string;
  preco: number;
  desc: string;
  foto: string;
}

const BRANDS = ["Natura", "O Boticário", "Avon", "Eudora", "Mary Kay", "Hinode", "Outro"];

export default function App() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [isVisitor, setIsVisitor] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [marca, setMarca] = useState(BRANDS[0]);
  const [desc, setDesc] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize: Load from URL or LocalStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const catalogId = urlParams.get('id');
    const legacyCatalogData = urlParams.get('catalogo');

    const loadCatalog = async (id: string) => {
      setLoading(true);
      try {
        const docRef = doc(db, 'catalogs', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.products) {
            setProdutos(data.products);
            localStorage.setItem("catalogoBeauty", JSON.stringify(data.products));
            showToast("Catálogo carregado com sucesso! ✨");
          }
        }
      } catch (e) {
        console.error("Erro ao carregar catálogo do Firebase", e);
      } finally {
        setLoading(false);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (catalogId) {
      setIsVisitor(true);
      loadCatalog(catalogId);
    } else if (legacyCatalogData) {
      setIsVisitor(true);
      // Keep legacy support for a while
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(legacyCatalogData))));
        if (Array.isArray(decoded)) {
          setProdutos(decoded);
          localStorage.setItem("catalogoBeauty", JSON.stringify(decoded));
          window.history.replaceState({}, document.title, window.location.pathname);
          showToast("Catálogo carregado do link antigo!");
        }
      } catch (e) {
        console.error("Erro ao carregar catálogo legado", e);
      }
    } else {
      const saved = localStorage.getItem("catalogoBeauty");
      if (saved) {
        try {
          setProdutos(JSON.parse(saved));
        } catch (e) {
          console.error("Erro ao carregar LocalStorage", e);
        }
      }
    }
  }, []);

  // Save to LocalStorage whenever products change
  useEffect(() => {
    if (produtos.length > 0) {
      localStorage.setItem("catalogoBeauty", JSON.stringify(produtos));
    }
  }, [produtos]);

  const showToast = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000; // Optimized for high clarity vs cloud storage limits
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw original
        ctx.drawImage(img, 0, 0, width, height);

        // Apply a subtle sharpening convolution (3x3 matrix)
        // This makes the product details "pop"
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const weights = [
          0, -1,  0,
         -1,  5, -1,
          0, -1,  0
        ];
        const side = Math.round(Math.sqrt(weights.length));
        const halfSide = Math.floor(side / 2);
        const output = ctx.createImageData(width, height);
        const dst = output.data;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const sy = y;
            const sx = x;
            const dstOff = (y * width + x) * 4;
            let r = 0, g = 0, b = 0;
            for (let cy = 0; cy < side; cy++) {
              for (let cx = 0; cx < side; cx++) {
                const scy = sy + cy - halfSide;
                const scx = sx + cx - halfSide;
                if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                  const srcOff = (scy * width + scx) * 4;
                  const wt = weights[cy * side + cx];
                  r += data[srcOff] * wt;
                  g += data[srcOff + 1] * wt;
                  b += data[srcOff + 2] * wt;
                }
              }
            }
            dst[dstOff] = r;
            dst[dstOff + 1] = g;
            dst[dstOff + 2] = b;
            dst[dstOff + 3] = data[dstOff + 3];
          }
        }
        
        ctx.putImageData(output, 0, 0);
        
        // Final export as high-quality JPEG
        setPreview(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getAutoDesc = (nome: string, marca: string) => {
    return `${nome} da ${marca}. Produto de alta qualidade, fragrância marcante e excelente opção para presentear ou uso diário. Aproveite esta oportunidade especial.`;
  };

  const adicionar = () => {
    if (!nome || !preco || !preview) {
      alert("Por favor, preencha o nome, preço e escolha uma foto.");
      return;
    }

    const finalDesc = desc.trim() || getAutoDesc(nome, marca);

    const novo: Product = {
      id: Date.now().toString(),
      nome,
      marca,
      preco: parseFloat(preco),
      desc: finalDesc,
      foto: preview
    };

    setProdutos([novo, ...produtos]);
    
    // Reset fields
    setNome('');
    setPreco('');
    setDesc('');
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast("Produto adicionado! ✨");
  };

  const remover = (id: string) => {
    if (confirm("Deseja remover este produto?")) {
      setProdutos(produtos.filter(p => p.id !== id));
      showToast("Produto removido.");
    }
  };

  const limparTudo = () => {
    if (confirm("Deseja apagar TODO o catálogo? Esta ação não pode ser desfeita.")) {
      setProdutos([]);
      setGeneratedLink(null);
      localStorage.removeItem("catalogoBeauty");
      showToast("Catálogo resetado.");
    }
  };

  const gerarLink = async () => {
    if (produtos.length === 0) return;
    
    setLoading(true);
    try {
      const slug = Math.random().toString(36).substring(2, 10);
      const docRef = doc(db, 'catalogs', slug);
      
      await setDoc(docRef, {
        products: produtos,
        createdAt: serverTimestamp()
      });

      const link = `${window.location.origin}${window.location.pathname}?id=${slug}`;
      setGeneratedLink(link);
      
      // Copy to clipboard
      navigator.clipboard.writeText(link);
      showToast("Link gerado e copiado! 🔗");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar catálogo. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-natural-bg font-sans text-natural-text pb-12">
      {/* Header */}
      <nav className="h-20 px-8 flex items-center justify-between border-b border-natural-border bg-white sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-natural-accent rounded-full flex items-center justify-center text-white italic font-serif text-xl border-2 border-white shadow-sm">B</div>
          <h1 className="font-serif italic text-2xl tracking-tight text-natural-dark">Catálogo Beauty Pro</h1>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
          <span className="hover:text-natural-accent cursor-pointer transition-colors">Catálogos</span>
          <span className="hover:text-natural-accent cursor-pointer transition-colors">Revendedoras</span>
          <button className="px-5 py-2.5 bg-natural-dark text-white rounded-full text-[9px] hover:bg-black transition-all">CONFIGURAÇÕES</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-10 relative">
        <AnimatePresence>
          {loading && produtos.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 bg-natural-accent/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-natural-accent animate-spin" />
              </div>
              <p className="font-serif italic text-xl text-natural-dark">Carregando seu catálogo...</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`grid grid-cols-1 ${isVisitor ? '' : 'lg:grid-cols-[400px_1fr]'} gap-8 items-start`}>
          
          {/* Panel: Add Product */}
          {!isVisitor && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-natural-sidebar p-8 rounded-[40px] border border-natural-border lg:sticky lg:top-28"
            >
              <div className="mb-8">
                <h2 className="font-serif text-2xl italic text-natural-dark mb-1">Novo Produto</h2>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Gerencie seu inventário digital</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold mb-2 block opacity-50">Imagem do Produto</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative h-48 w-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-white/50 ${
                      preview ? 'border-natural-accent' : 'border-[#d1d1c4] hover:border-natural-accent'
                    }`}
                  >
                    {preview ? (
                      <>
                        <img 
                          src={preview} 
                          alt="Preview" 
                          className="w-full h-full object-cover beauty-filter" 
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs font-bold tracking-widest uppercase flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Trocar Foto
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <div className="text-3xl mb-1 opacity-60">📸</div>
                        <p className="text-[10px] font-bold tracking-[0.2em] opacity-40">CARREGAR FOTO</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold mb-2 block opacity-50">Marca & Nome</label>
                  <div className="flex gap-2">
                    <select 
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      className="w-1/3 bg-white border border-natural-border rounded-xl px-3 py-3 text-xs outline-none focus:ring-1 focus:ring-natural-accent transition-all font-medium"
                    >
                      {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <input 
                      type="text" 
                      placeholder="Nome do item"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="flex-1 bg-white border border-natural-border rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-natural-accent transition-all font-medium placeholder:opacity-30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold mb-2 block opacity-50">Preço Sugerido (R$)</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    className="w-full bg-white border border-natural-border rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-natural-accent transition-all font-medium placeholder:opacity-30"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold mb-2 block opacity-50">Descrição Breve</label>
                  <textarea 
                    placeholder="Notas sobre o produto..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={4}
                    className="w-full bg-white border border-natural-border rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-natural-accent transition-all font-medium placeholder:opacity-30 resize-none"
                  />
                </div>

                <div className="pt-2 space-y-3">
                  <button 
                    onClick={adicionar}
                    className="w-full bg-natural-accent hover:bg-natural-dark text-white font-bold py-4 rounded-2xl shadow-lg shadow-natural-accent/20 transition-all active:scale-95 text-sm"
                  >
                    ✨ Adicionar ao Catálogo
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={gerarLink}
                      disabled={produtos.length === 0 || loading}
                      className="bg-natural-dark border border-black/5 hover:bg-black disabled:bg-slate-300 text-white font-bold py-3 rounded-2xl transition-all active:scale-95 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
                      {loading ? 'Salvando...' : 'Link'}
                    </button>
                    <button 
                      onClick={limparTudo}
                      className="bg-natural-border/30 font-bold text-natural-dark py-3 rounded-2xl hover:bg-natural-border/60 transition-all active:scale-95 text-[10px] uppercase tracking-widest border border-natural-border/50"
                    >
                      🗑 Limpar
                    </button>
                  </div>
                </div>

                {generatedLink && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-white/50 p-4 rounded-2xl border border-natural-accent/20 mt-4 overflow-hidden"
                  >
                    <p className="text-[9px] uppercase font-bold text-natural-accent mb-2 tracking-[0.1em]">Seu Link de Catálogo</p>
                    <p className="text-[10px] text-natural-text opacity-70 break-all bg-white p-3 rounded-xl border border-natural-border leading-relaxed font-mono">
                      {generatedLink}
                    </p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        showToast("Copiado com sucesso!");
                      }}
                      className="w-full text-center text-natural-accent text-[10px] font-bold mt-3 hover:underline tracking-widest"
                    >
                      COPIAR LINK
                    </button>
                  </motion.div>
                )}

                <div className="mt-8 p-5 bg-[#ecece4]/50 rounded-2xl text-[11px] leading-relaxed opacity-60 italic text-center border border-white">
                  "A beleza começa no momento em que você decide ser você mesma."
                </div>
              </div>
            </motion.div>
          )}

          {/* Catalog Display */}
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h3 className="font-serif text-4xl italic text-natural-dark mb-1">
                  {isVisitor ? 'Vitrine de Beleza' : 'Sua Vitrine'}
                </h3>
                <p className="text-sm text-natural-accent font-medium">
                  {produtos.length} {produtos.length === 1 ? 'produto ativo' : 'produtos ativos'} no momento
                </p>
              </div>
              {produtos.length > 0 && !isVisitor && (
                <button 
                  onClick={() => {
                    const text = `Confira meu catálogo de beleza: ${window.location.href}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                  }}
                  className="bg-natural-dark text-white px-8 py-3 rounded-full text-xs font-bold tracking-widest hover:bg-black transition-all shadow-xl shadow-natural-dark/10 flex items-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  COMPARTILHAR TUDO
                </button>
              )}
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${isVisitor ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-8`}>
              <AnimatePresence mode="popLayout">
                {produtos.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300"
                  >
                    <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-medium">Nenhum produto cadastrado.</p>
                    <p className="text-sm">
                      {isVisitor ? 'Este catálogo parece estar vazio no momento.' : 'Use o formulário para começar a vender.'}
                    </p>
                  </motion.div>
                ) : (
                  produtos.map((p, index) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="group bg-white rounded-[32px] overflow-hidden shadow-sm border border-[#f0eee4] hover:shadow-2xl hover:shadow-natural-accent/10 transition-all flex flex-col p-4"
                    >
                      {/* Premium Content Holder with Backdrop Filter */}
                      <div className="relative aspect-[4/3] w-full rounded-[24px] overflow-hidden mb-6 bg-natural-sidebar premium-glow border border-black/5">
                        {/* Dynamic Blurred Backdrop for Atmosphere */}
                        <div 
                          className="absolute inset-0 opacity-40 blur-2xl scale-125"
                          style={{ backgroundImage: `url(${p.foto})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                        
                        <img 
                          src={p.foto} 
                          alt={p.nome} 
                          className="relative z-10 w-full h-full object-contain transition-transform duration-1000 group-hover:scale-110 beauty-filter" 
                        />
                        <div className="absolute top-3 left-3 z-20">
                          <span className="bg-white/90 backdrop-blur-md text-natural-dark px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] shadow-sm border border-black/5">
                            {p.marca}
                          </span>
                        </div>
                        {!isVisitor && (
                          <button 
                            onClick={() => remover(p.id)}
                            className="absolute top-3 right-3 z-20 bg-white/40 backdrop-blur-md p-2 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition-all shadow-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="px-1 flex-grow flex flex-col">
                        <h4 className="font-serif text-xl italic text-natural-dark leading-snug mb-2 group-hover:text-natural-accent transition-colors">{p.nome}</h4>
                        <p className="text-xs text-natural-text opacity-60 leading-relaxed line-clamp-2 mb-6 flex-grow">
                          {p.desc}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-natural-border">
                          <div className="text-xl font-bold text-natural-dark tracking-tight tabular-nums">
                            {formatCurrency(p.preco)}
                          </div>
                          <button 
                            onClick={() => {
                              const msg = encodeURIComponent(`Olá! Tenho interesse em ${p.nome} da marca ${p.marca} que vi no seu catálogo.`);
                              window.open(`https://wa.me/5592999999999?text=${msg}`, '_blank');
                            }}
                            className="w-10 h-10 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-90"
                          >
                            <MessageCircle className="w-5 h-5 fill-white" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-natural-dark text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <CheckCircle2 className="w-4 h-4 text-white opacity-60" />
            <span className="text-xs font-bold tracking-widest uppercase">{status}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Section (Only for Consultant) */}
      {!isVisitor && (
        <div className="max-w-7xl mx-auto px-6 mt-16">
          <div className="p-10 border border-dashed border-natural-border rounded-[40px] flex flex-col md:flex-row items-center justify-between bg-white gap-8 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-natural-sidebar rounded-full flex items-center justify-center text-3xl shadow-inner italic font-serif">📈</div>
              <div>
                <p className="text-lg font-serif italic text-natural-dark">Alcance do Link</p>
                <p className="text-sm opacity-50 font-medium">Suas visitas estão crescendo! Continue compartilhando.</p>
              </div>
            </div>
            <button className="text-[10px] font-black text-natural-accent underline underline-offset-8 tracking-[0.2em] hover:text-natural-dark transition-colors">VER RELATÓRIO COMPLETO</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center mt-24 mb-12 text-natural-accent opacity-40 text-[10px] font-bold tracking-[0.3em] uppercase">
        <p>© 2024 Beauty Pro • Transformando beleza em negócios</p>
      </footer>
    </div>
  );
}
