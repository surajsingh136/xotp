import { Link } from 'react-router-dom'
import { Button } from '../ui.jsx'
import BuyFlow from '../components/BuyFlow.jsx'

export default function BuyEmail() {
  return (
    <BuyFlow
      servers={[{ id: 'email', name: 'Email inboxes' }]}
      defaultServer="email"
      scope="email"
      title="Buy email"
      sub="Gmail via SMSBower \u00B7 Temp Mail via mail.tm \u2014 real inboxes, billed per code."
      headActions={
        <Link to="/buy">
          <Button size="sm" variant="ghost">Buy number</Button>
        </Link>
      }
    />
  )
}