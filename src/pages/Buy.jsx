import BuyFlow from '../components/BuyFlow.jsx'

const SERVERS = [
  { id: 'server1', name: 'Server 1' },
  { id: 'server2', name: 'Server 2' },
  { id: 'server3', name: 'Server 3' },
  { id: 'server4', name: 'Server 4' },
]

export default function Buy() {
  return (
    <BuyFlow
      servers={SERVERS}
      defaultServer="server1"
      scope="number"
      title="Buy number"
      sub={'Pick a server, then a service \u2014 wait seconds for the code.'}
    />
  )
}