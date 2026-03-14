import { supabase } from '../lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function Home() {
  const [size, setSize] = useState(null)
  const [excerpts, setExcerpts] = useState([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('') // admin email check input

  useEffect(() => {
    fetchSize()
    fetchExcerpts()
  }, [])

  async function fetchSize() {
    try {
      const res = await fetch('/api/get-size')
      const j = await res.json()
      setSize(j.total_size)
    } catch(e) { console.error('Error fetching size:', e) }
  }

  async function fetchExcerpts() {
    try {
      // requires the public/anon key to have SELECT permission on log_excerpts_parent, 
      // or at least Row Level Security that allows read
      const { data } = await supabase
        .from('log_excerpts_parent')
        .select('id,source,level,message_excerpt,ts')
        .order('ts', { ascending: false })
        .limit(20)
      setExcerpts(data || [])
    } catch(e) { console.error('Error fetching excerpts:', e) }
  }

  async function runCleanup() {
    if (!email) {
      alert('Please enter an admin email.')
      return;
    }
    
    setLoading(true)
    try {
      const res = await fetch('/api/run-cleanup', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email }) 
      })
      const j = await res.json()
      alert(JSON.stringify(j, null, 2))
      fetchSize()
    } catch(e) {
      alert('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b pb-4">
          <h1 className="text-3xl font-extrabold tracking-tight">Mission Control</h1>
          <span className="text-sm bg-blue-100 text-blue-800 py-1 px-3 rounded-full font-medium">
            Supabase Log Manager
          </span>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* DB Size Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center">
            <h2 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-1">Database Size</h2>
            <div className="text-4xl font-light text-blue-600">
              {size ?? <span className="text-gray-300">Carregando...</span>}
            </div>
            <p className="text-xs text-gray-400 mt-2">Tamanho total da tabela de excertos</p>
          </div>
          
          {/* Action Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2">
            <h2 className="text-lg font-bold mb-4">Ação Manual: Limpeza de Logs</h2>
            <p className="text-sm text-gray-600 mb-4">
              O agendamento automático limpa os logs antigas durante a madrugada (UTC). Utilize esta ação para forçar a deleção IMEDIATA dos registros mais velhos que a retenção (90 dias).
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input 
                type="email"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="Insira o seu e-mail de Administrador" 
                className="w-full sm:w-64 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
              <button 
                onClick={runCleanup} 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Executar Batch de Limpeza'}
              </button>
            </div>
          </div>
          
        </div>

        {/* Recent Excerpts List */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-gray-800">Últimos Logs Armazenados (Top 20)</h2>
            <button onClick={fetchExcerpts} className="text-blue-600 text-sm font-medium hover:underline focus:outline-none">Atualizar</button>
          </div>
          
          <div className="divide-y divide-gray-100">
            {excerpts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 italic">Nenhum registro encontrado nas tabelas.</div>
            ) : (
              excerpts.map(e => (
                <div key={e.id} className="p-4 sm:px-6 hover:bg-gray-50 transition duration-150">
                  <div className="flex justify-between items-start flex-wrap gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide
                        ${e.level === 'error' ? 'bg-red-100 text-red-700' : 
                          e.level === 'warning' ? 'bg-orange-100 text-orange-700' : 
                          'bg-green-100 text-green-700'}`}>
                        {e.level || 'info'}
                      </span>
                      <span className="font-mono text-sm font-medium text-gray-800">{e.source}</span>
                    </div>
                    <time className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {new Date(e.ts).toLocaleString('pt-BR')}
                    </time>
                  </div>
                  <p className="text-sm text-gray-700 mt-2 font-mono bg-gray-50 p-2 rounded border border-gray-100 break-words">
                    {e.message_excerpt || '<No message>'}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
