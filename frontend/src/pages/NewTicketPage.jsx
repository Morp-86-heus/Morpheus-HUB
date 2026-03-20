import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import TicketForm from '../components/TicketForm'
import { ticketsApi } from '../api/client'

export default function NewTicketPage() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    if (id) {
      ticketsApi.get(id).then(r => {
        setTicket(r.data)
        setLoading(false)
      })
    }
  }, [id])

  if (loading) return <div className="text-center py-12 text-gray-400">Caricamento...</div>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {id ? `Modifica Ticket #${id}` : 'Nuovo Ticket'}
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <TicketForm initialData={ticket} />
      </div>
    </div>
  )
}
