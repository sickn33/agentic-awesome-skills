import { Badge, Field, Segmented, Stage, Text, Window } from '../../kit'
import { CanvasLook, ConsoleLook, FinanceLook, MessagesLook, ResearchLook } from './studies'
import { DimensionalLook } from './skeuomorphic'
import './radix.css'
import './looks.css'

// The same invitation in three product identities. Copy a look's tokens,
// then preserve the target product's typography and density, not this UI.
function Scene() {
  return (
    <Window url="app.northwind.co" className="lk-window">
      <div className="lk-body">
        <div className="lk-intro">
          <div className="lk-head"><Text className="lk-title">Invite your team</Text><Badge tone="accent">3 seats</Badge></div>
          <Text className="lk-description">Choose who can access this workspace.</Text>
        </div>
        <Field label="Email address" value="ada@northwind.co" />
        <Segmented items={['Member', 'Admin', 'Guest']} value={0} />
        <div className="lk-invite">Send invitation <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M2.5 7h9M7.5 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
      </div>
    </Window>
  )
}

const looks = [
  ['look-default', 'Quiet workspace', 'System type · compact controls'],
  ['look-radix', 'Technical product', 'Indigo · precise borders'],
  ['look-consumer', 'Consumer app', 'Roomier controls · soft corners'],
] as const

const studies = [
  { look: 'look-console', title: 'Developer console', detail: 'Dark surfaces · restrained status', scene: ConsoleLook },
  { look: 'look-finance', title: 'Financial overview', detail: 'Tabular figures · measured hierarchy', scene: FinanceLook },
  { look: 'look-canvas', title: 'Creative workspace', detail: 'Open canvas · precise selection', scene: CanvasLook },
  { look: 'look-messages', title: 'Team conversation', detail: 'Soft surfaces · comfortable rhythm', scene: MessagesLook },
  { look: 'look-research', title: 'Research notebook', detail: 'Sans-serif reading · quiet structure', scene: ResearchLook },
  { look: 'look-dimensional', title: 'Dimensional surfaces', detail: 'Layered paper · precise lighting', scene: DimensionalLook },
] as const

export default function Looks() {
  return <div className="lk-pair">{looks.map(([look, title, detail]) => (
    <figure key={look} className={look}>
      <Stage specimen width={358} height={360} compact={{ below: 358, width: 288, height: 360 }} initial={{}}>{() => <Scene />}</Stage>
      <figcaption><strong>{title}</strong><span>{detail}</span></figcaption>
    </figure>
  ))}{studies.map(({ look, title, detail, scene: Study }) => (
    <figure key={look} className={look}>
      <Stage width={358} height={360} compact={{ below: 358, width: 288, height: 360 }} greys="cool" theme={look === 'look-console' ? 'dark' : 'light'}>
        {() => <Study />}
      </Stage>
      <figcaption><strong>{title}</strong><span>{detail}</span></figcaption>
    </figure>
  ))}</div>
}
