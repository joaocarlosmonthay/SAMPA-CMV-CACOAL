"use client"

import { useState, useEffect } from "react"
import { PlusCircle, CheckCircle2, Package, Pencil, Trash2, X, Tags, Upload, Beaker, FolderTree } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"

const UNIDADES = ["Kg", "Litro", "Unidade", "Pacote", "CX", "PCT"]

export type Produto = {
  id: number; nome: string; grupo: string; unidade: string; producao_interna: boolean;
}

interface CadastrosProps {
  produtos: Produto[]; 
  onRefresh: () => void;
  isReadOnly: boolean;
}

export function Cadastros({ produtos, onRefresh, isReadOnly }: CadastrosProps) {
  const [aba, setAba] = useState<"produtos" | "categorias">("produtos")
  const [categoriasDB, setCategoriasDB] = useState<{id: number, nome: string}[]>([])
  
  const [nome, setNome] = useState("")
  const [grupo, setGrupo] = useState("")
  const [unidade, setUnidade] = useState("")
  const [producaoInterna, setProducaoInterna] = useState(false)
  
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState("")
  const [importando, setImportando] = useState(false)

  useEffect(() => { carregarCategorias() }, [])

  const carregarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('nome')
    if (data) setCategoriasDB(data)
  }

  const resetForm = () => {
    setNome(""); setGrupo(""); setUnidade(""); setProducaoInterna(false); setEditandoId(null); setSalvando(false);
  }

  const handleSalvarProduto = async () => {
    if (isReadOnly) return toast.error("Período bloqueado!")
    if (!nome.trim() || !grupo || !unidade) return toast.error("Preencha os campos!")
    
    setSalvando(true)
    const payload = { nome: nome.trim(), unidade: unidade, grupo: grupo, producao_interna: producaoInterna }

    if (editandoId) {
      await supabase.from('produtos').update(payload).eq('id', editandoId)
      toast.success("Atualizado!")
    } else {
      await supabase.from('produtos').insert([payload])
      toast.success("Salvo!")
    }
    
    resetForm()
    onRefresh()
  }

  const handleDeletarProduto = async (id: number, nomeProd: string) => {
    if (isReadOnly) return toast.error("Período bloqueado!")
    if (window.confirm(`Apagar o produto ${nomeProd} definitivamente?`)) {
      await supabase.from('produtos').delete().eq('id', id)
      toast.success("Deletado!")
      onRefresh()
    }
  }

  const handleSalvarCategoria = async () => {
    if (isReadOnly) return toast.error("Período bloqueado!")
    if (!novaCategoria.trim()) return
    await supabase.from('categorias').insert([{ nome: novaCategoria.trim() }])
    setNovaCategoria("")
    toast.success("Categoria salva!")
    carregarCategorias()
  }

  const handleDeletarCategoria = async (id: number, nomeCat: string) => {
    if (isReadOnly) return toast.error("Período bloqueado!")
    if (window.confirm(`ATENÇÃO: Deseja apagar a categoria ${nomeCat}?`)) {
      await supabase.from('categorias').delete().eq('id', id)
      toast.success("Categoria deletada!")
      carregarCategorias()
      onRefresh()
    }
  }

  const handleImportarCSVProdutos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return toast.error("Período bloqueado!")
    const file = e.target.files?.[0]
    if (!file) return

    setImportando(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const delimitador = text.includes(';') ? ';' : ','
        const rows = text.split('\n').map(row => row.split(delimitador))

        const headers = rows[0].map(h => h.trim().replace(/"/g, ''))
        const nomeIdx = headers.indexOf('nome')
        const unidIdx = headers.indexOf('unidade')
        const grupoIdx = headers.indexOf('grupo')

        if (nomeIdx === -1) {
          alert("❌ CSV inválido! O ficheiro precisa ter no mínimo a coluna 'nome'.")
          setImportando(false); return
        }

        const produtosParaInserir = []
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i] || rows[i].length < 2) continue
          
          const nomeProd = rows[i][nomeIdx]?.replace(/"/g, '')
          const unid = unidIdx !== -1 ? rows[i][unidIdx]?.replace(/"/g, '') : 'Unidade'
          const grp = grupoIdx !== -1 ? rows[i][grupoIdx]?.replace(/"/g, '') : 'Outros'

          if (nomeProd) {
            produtosParaInserir.push({ nome: nomeProd, unidade: unid, grupo: grp })
          }
        }

        if (produtosParaInserir.length === 0) {
            alert("Nenhum produto encontrado no ficheiro."); setImportando(false); return
        }

        const { error } = await supabase.from('produtos').insert(produtosParaInserir)
        if (error) throw error

        alert(`✅ Sucesso! ${produtosParaInserir.length} produtos foram importados.`)
        onRefresh()
      } catch (error: any) {
        alert("Erro ao importar: " + error.message)
      } finally {
        setImportando(false)
        if(e.target) e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const byGroup = categoriasDB.reduce<Record<string, Produto[]>>((acc, c) => {
    acc[c.nome] = produtos.filter((p) => p.grupo === c.nome)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
        <button onClick={() => setAba("produtos")} className={`px-6 py-2.5 rounded-lg font-bold transition-all ${aba === "produtos" ? "bg-white text-blue-600 shadow" : "text-slate-500"}`}>Produtos</button>
        <button onClick={() => setAba("categorias")} className={`px-6 py-2.5 rounded-lg font-bold transition-all ${aba === "categorias" ? "bg-white text-blue-600 shadow" : "text-slate-500"}`}>Categorias</button>
      </div>

      {aba === "categorias" ? (
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-5 animate-in fade-in">
          <h3 className="text-xl font-bold flex items-center gap-2"><Tags className="text-blue-600" /> Gerir Categorias</h3>
          <div className="flex gap-3">
            <input disabled={isReadOnly} value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} placeholder="Ex: Bebidas" className="flex-1 p-4 text-lg border-2 rounded-xl focus:border-blue-500 outline-none disabled:opacity-50" />
            <button onClick={handleSalvarCategoria} disabled={!novaCategoria.trim() || isReadOnly} className="bg-emerald-600 text-white px-8 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50">Adicionar</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {categoriasDB.map(c => (
              <div key={c.id} className="p-4 bg-slate-50 border rounded-xl flex justify-between items-center">
                <span className="font-bold text-lg text-slate-700">{c.nome}</span>
                <button disabled={isReadOnly} onClick={() => handleDeletarCategoria(c.id, c.nome)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg disabled:opacity-30"><Trash2 size={20}/></button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in">
          <div className={`bg-white rounded-2xl border-2 p-6 shadow-sm space-y-5 ${editandoId ? "border-blue-500 bg-blue-50/50" : "border-slate-200"}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl font-bold text-slate-800">{editandoId ? "Editar Produto" : "Novo Produto"}</h3>
              <div className="flex items-center gap-3">
                {!editandoId && (
                  <div>
                    <input type="file" accept=".csv" id="csv-produtos" className="hidden" onChange={handleImportarCSVProdutos} disabled={importando || isReadOnly} />
                    <label htmlFor="csv-produtos" className={`cursor-pointer px-4 py-2 rounded-lg font-bold text-sm border shadow-sm flex items-center gap-2 transition-all ${isReadOnly ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300'}`}>
                       <Upload className="w-4 h-4"/>
                       {importando ? "A ler..." : "📥 Importar Produtos"}
                    </label>
                  </div>
                )}
                {editandoId && <button onClick={resetForm} className="text-slate-400 hover:text-red-500"><X /></button>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-semibold block text-slate-600 text-sm">Nome do Produto</label>
              <input type="text" disabled={isReadOnly} value={nome} onChange={(e) => setNome(e.target.value)} className="w-full p-3.5 rounded-xl border-2 bg-slate-50 focus:border-blue-500 outline-none disabled:opacity-50" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="font-semibold block text-slate-600 text-sm">Categoria Principal</label>
                <select disabled={isReadOnly} value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full p-3.5 rounded-xl border-2 bg-slate-50 focus:border-blue-500 outline-none disabled:opacity-50">
                  <option value="">Selecione...</option>
                  {categoriasDB.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-semibold block text-slate-600 text-sm">Unidade</label>
                <select disabled={isReadOnly} value={unidade} onChange={(e) => setUnidade(e.target.value)} className="w-full p-3.5 rounded-xl border-2 bg-slate-50 focus:border-blue-500 outline-none disabled:opacity-50">
                  <option value="">Selecione...</option>
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-3 p-4 border-2 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  disabled={isReadOnly} 
                  checked={producaoInterna} 
                  onChange={(e) => setProducaoInterna(e.target.checked)} 
                  className="w-5 h-5 accent-blue-600 cursor-pointer" 
                />
                <div>
                  <p className="font-bold text-slate-800 flex items-center gap-2">Produto Fabricado na Loja (Subproduto) <Beaker className="w-4 h-4 text-blue-500"/></p>
                  <p className="text-xs text-slate-500 font-medium">O sistema vai manter a contagem de estoque, mas ignorar o custo no CMV para evitar bitributação.</p>
                </div>
              </label>
            </div>

            <button onClick={handleSalvarProduto} disabled={!nome.trim() || !grupo || !unidade || salvando || isReadOnly} className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 flex justify-center gap-2 transition-colors">
              {salvando ? "A Guardar..." : editandoId ? <><CheckCircle2 /> Atualizar</> : <><PlusCircle /> Salvar</>}
            </button>
          </div>

          <div className="space-y-6">
            {categoriasDB.map((c) => {
              const lista = byGroup[c.nome]
              if (!lista || lista.length === 0) return null
              return (
                <div key={c.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b flex items-center gap-2"><Package className="text-blue-600" /><h4 className="text-lg font-bold text-slate-700">{c.nome}</h4><span className="ml-auto text-sm font-medium bg-white px-2 py-0.5 rounded-full border text-slate-500">{lista.length} itens</span></div>
                  <ul className="divide-y divide-slate-100">
                    {lista.map((p) => (
                      <li key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 block">{p.nome}</span>
                            {p.producao_interna && <span className="bg-blue-100 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Fabricado</span>}
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{p.unidade}</span>
                        </div>
                        <div className="flex gap-2">
                          <button disabled={isReadOnly} onClick={() => {setNome(p.nome); setGrupo(p.grupo); setUnidade(p.unidade); setProducaoInterna(p.producao_interna); setEditandoId(p.id); window.scrollTo(0,0)}} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg disabled:opacity-30"><Pencil size={20}/></button>
                          <button disabled={isReadOnly} onClick={() => handleDeletarProduto(p.id, p.nome)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-30"><Trash2 size={20}/></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}