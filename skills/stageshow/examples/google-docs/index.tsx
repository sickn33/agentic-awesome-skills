import type { CSSProperties } from 'react'
import { BrandMark, Avatar, Bar, Collapse, Stage, Window, type Act, type Layout } from '../../kit'
import './docs.css'

// Google Docs: comment on a sentence, get a reply.
// Context: a planning doc is open, a collaborator is in it too.
// 1. The writer drag-selects one sentence; the margin buttons appear beside it.
// 2. Add comment: the sentence turns yellow and a comment box opens in the margin.
// 3. They type the comment and post it; the box settles into a comment card.
// 4. Priya's reply lands in the thread.
// 5. They resolve the thread: the card and the highlight leave, the doc is as it began.
//
// Real strings: the doc title, the one paragraph, the comment, the reply, the
// two names, the menu bar and the comment buttons. The rest is placeholder.

const LEAD = 'Beta opens to the waitlist in October. '
const SENTENCE = 'The public launch is planned for November 12, alongside the new pricing page.'
const PARA = LEAD + SENTENCE
const START = LEAD.length
const END = PARA.length

const COMMENT = 'Can we move this to the 19th? Pricing needs one more week.'
const REPLY = 'Works for me. I’ll update the timeline.'

type Card = 'hidden' | 'compose' | 'posted' | 'resolved'
type S = {
  sel: number
  hl: 'none' | 'select' | 'comment'
  margin: boolean
  card: Card
  draft: string
  reply: boolean
}

const initial: S = { sel: START, hl: 'none', margin: false, card: 'hidden', draft: '', reply: false }
const poster: S = { sel: END, hl: 'comment', margin: false, card: 'posted', draft: COMMENT, reply: true }

const REST = { x: 560, y: 520 }

async function script(a: Act<S>) {
  a.mark('start')
  await a.wait(900)

  // 1. Select the sentence
  const s0 = a.rect('sent-start')
  const e0 = a.rect('sent-end')
  await a.move({ x: s0.x + 1, y: s0.y + s0.height / 2 })
  await a.wait(250)
  a.mark('select')
  a.put({ hl: 'select' })
  await a.drag({ x: e0.x + 1, y: e0.y + e0.height / 2 }, (at) => a.put({ sel: Math.max(START, a.caret('para', at)) }), { duration: 1300 })
  a.put({ sel: END })
  await a.wait(150)
  await a.set({ margin: true })
  await a.wait(450)

  // 2. Add a comment from the margin
  await a.move('add-comment')
  await a.wait(250)
  a.mark('compose')
  await a.click()
  await a.set({ margin: false, hl: 'comment', card: 'compose' })
  await a.wait(350)
  // Step out of the way of the box while typing
  await a.move('rest-type')
  await a.wait(150)
  await a.type('draft', COMMENT, { interval: 42 })
  await a.wait(400)

  // 3. Post it
  a.mark('post')
  await a.click({ at: 'post', x: 0.9, y: 0.82 })
  await a.set({ card: 'posted' })
  await a.wait(500)
  await a.move('rest-read')
  await a.wait(1200)

  // 4. The collaborator replies
  a.mark('reply')
  await a.set({ reply: true })
  await a.wait(2600)

  // 5. Resolve the thread: a caused reset back to the opening frame
  a.mark('resolve')
  await a.click({ at: 'resolve', x: 0.5, y: 0.5 })
  await a.set({ card: 'resolved', hl: 'none' })
  await a.wait(900)
  await a.snap({ ...initial })
  await a.move(REST)
  await a.wait(600)
}

export default function GoogleDocs() {
  return (
    <Stage
      width={940}
      height={600}
      compact={{ below: 600, width: 460, height: 560 }}
      initial={initial}
      poster={poster}
      script={script}
      cursor={{ at: REST }}
      className="gd-stage"
    >
      {(s, rect, layout) => <Docs s={s} rect={rect} layout={layout} />}
    </Stage>
  )
}

function Docs({ s, rect, layout }: { s: S; rect: (n: string) => { x: number; y: number; width: number; height: number }; layout: Layout }) {
  const compact = layout === 'compact'
  const canvas = rect('canvas')
  const anchor = rect('sent-start')
  const end = rect('sent-end')
  // Wide: the card sits in the margin beside the sentence. Compact: there is no
  // margin, so it floats over the page just under the sentence, as Docs does when narrow.
  const cardTop = compact ? end.y - canvas.y + end.height + 14 : anchor.y - canvas.y - 10
  const marginTop = end.y - canvas.y + end.height / 2 - 52
  const posted = s.card === 'posted' || s.card === 'resolved'
  const open = s.card === 'compose' || s.card === 'posted'
  return (
    <Window url="docs.google.com/document/d/1Qx4…/edit" urlShape="pill" className="gd-window" data-layout={layout}>
      <Header compact={compact} />
      <Toolbar compact={compact} />
      <div className="gd-canvas" data-target="canvas">
        {!compact && (
          <span className="gd-outline">
            <Sym n="format_list_bulleted" size={20} />
          </span>
        )}
        <div className="gd-page">
          <div className="gd-h1">Q4 launch plan</div>
          <p className="gd-para" data-target="para" data-cursor="ibeam">
            {PARA.slice(0, START)}
            {/* Keep a wrapped selection moving forward: its compact anchor starts a line. */}
            {compact && <br />}
            <span data-target="sent-start" className="gd-anchor" />
            <span className="gd-sel" data-hl={s.hl}>
              {PARA.slice(START, s.sel)}
            </span>
            {PARA.slice(s.sel)}
            <span data-target="sent-end" className="gd-anchor" />
          </p>
          <Bar w={compact ? 84 : 110} h={9} tone={4} className="gd-heading" />
          <div className="gd-lines">
            {(compact ? ['100%', '92%', '97%', '64%'] : ['100%', '96%', '99%', '58%']).map((w, i) => (
              <Bar key={i} w={w} h={6} tone={2} />
            ))}
          </div>
          <div className="gd-lines">
            {['98%', '100%', '71%'].map((w, i) => (
              <Bar key={i} w={w} h={6} tone={2} />
            ))}
          </div>
          <Bar w={compact ? 70 : 96} h={9} tone={4} className="gd-heading" />
          <div className="gd-lines">
            {['100%', '94%', '97%', '62%'].map((w, i) => (
              <Bar key={i} w={w} h={6} tone={2} />
            ))}
          </div>
        </div>

        {/* The margin buttons beside a selection: comment, react, suggest */}
        <div className="gd-margin" data-show={s.margin || undefined} style={{ top: marginTop }}>
          <span className="gd-margin__btn" data-target="add-comment">
            <Sym n="add_comment" size={18} />
          </span>
          <span className="gd-margin__btn">
            <Sym n="add_reaction" size={18} />
          </span>
          <span className="gd-margin__btn">
            <Sym n="rate_review" size={18} />
          </span>
        </div>

        <div className="gd-card" data-state={s.card} data-show={open || undefined} style={{ top: cardTop }}>
          <div className="gd-head">
            <Avatar name="Alex" size={28} className="gd-av gd-av--me" />
            <div className="gd-who">
              <div className="gd-name">Alex Rivera</div>
              <Collapse open={posted}>
                <div className="gd-time">10:42 AM Today</div>
              </Collapse>
            </div>
            <div className="gd-acts" data-on={posted || undefined}>
              <span className="gd-icon-btn" data-target="resolve" data-cursor="hand">
                <Sym n="check" size={18} />
              </span>
              <span className="gd-icon-btn">
                <Sym n="more_vert" size={18} />
              </span>
            </div>
          </div>
          <div className="gd-body">
            <div className="gd-field" data-on={(s.card === 'compose') || undefined} data-empty={!s.draft || undefined}>
              <span className="gd-field__ring" />
              <span className="gd-field__ph">Comment or add others with @</span>
              <span className="gd-field__text">
                {s.draft}
                <span className="gd-caret" data-on={s.card === 'compose' || undefined} />
              </span>
            </div>
          </div>
          <Collapse open={s.card === 'compose' || s.card === 'hidden'}>
            <div className="gd-actions">
              <span className="gd-btn gd-btn--text">Cancel</span>
              <span className="gd-btn gd-btn--fill" data-ready={s.draft.length > 0 || undefined} data-target="post" data-cursor="hand">
                Comment
              </span>
            </div>
          </Collapse>
          <Collapse open={posted && s.reply}>
            <div className="gd-reply">
              <div className="gd-head">
                <Avatar name="Priya" size={28} className="gd-av gd-av--them" />
                <div className="gd-who">
                  <div className="gd-name">Priya Shah</div>
                  <div className="gd-time">Just now</div>
                </div>
              </div>
              <div className="gd-reply__text">{REPLY}</div>
            </div>
          </Collapse>
          <Collapse open={posted && !compact}>
            <div className="gd-replybox">Reply or add others with @</div>
          </Collapse>
        </div>

        {/* Where the cursor waits while the keys do the work */}
        <span className="gd-rest" data-target="rest-type" style={{ left: compact ? 60 : 470, top: Math.max(0, cardTop + (compact ? 120 : 150)) }} />
        <span className="gd-rest" data-target="rest-read" style={{ left: compact ? 70 : 440, top: Math.max(0, cardTop + (compact ? 170 : 210)) }} />
      </div>
    </Window>
  )
}

function Header({ compact }: { compact: boolean }) {
  const menus = compact ? ['File', 'Edit', 'View', 'Insert'] : ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help']
  return (
    <div className="gd-header">
      <BrandMark brand="google-docs" tile={false} size={26} width={26} className="gd-mark" />
      <div className="gd-titleblock">
        <div className="gd-titlerow">
          <span className="gd-title">Q4 launch plan</span>
          {!compact && (
            <span className="gd-title-icons">
              <Sym n="star" size={18} />
              <Sym n="drive_file_move" size={18} />
              <Sym n="cloud_done" size={18} />
            </span>
          )}
        </div>
        <div className="gd-menus">
          {menus.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
      <div className="gd-header__right">
        {!compact && <Sym n="history" size={22} />}
        {!compact && <Sym n="chat" size={22} />}
        <Avatar name="Priya" size={26} className="gd-av gd-av--them gd-presence" />
        <span className="gd-share">
          <Sym n="lock_f" size={16} />
          {!compact && 'Share'}
        </span>
        {!compact && <Avatar name="Alex" size={30} className="gd-av gd-av--me" />}
      </div>
    </div>
  )
}

function Toolbar({ compact }: { compact: boolean }) {
  return (
    <div className="gd-toolbar-wrap">
      <div className="gd-toolbar">
        {!compact && <Sym n="search" size={18} />}
        <Sym n="undo" size={18} />
        <Sym n="redo" size={18} />
        {!compact && <Sym n="print" size={18} />}
        {!compact && <Sym n="spellcheck" size={18} />}
        {!compact && <Sym n="format_paint" size={18} />}
        <span className="gd-sep" />
        <Drop w={compact ? 22 : 30} />
        {!compact && <span className="gd-sep" />}
        {!compact && <Drop w={60} />}
        <span className="gd-sep" />
        <Drop w={compact ? 34 : 40} />
        <span className="gd-sep" />
        <Sym n="format_bold" size={18} />
        <Sym n="format_italic" size={18} />
        <Sym n="format_underlined" size={18} />
        <Sym n="format_color_text" size={18} />
        {!compact && <span className="gd-sep" />}
        {!compact && <Sym n="link" size={18} />}
        {!compact && <Sym n="add_comment" size={18} />}
        {!compact && <Sym n="image" size={18} />}
        <span className="gd-toolbar__end">
          <Sym n="more_vert" size={18} />
        </span>
      </div>
    </div>
  )
}

function Drop({ w }: { w: number }) {
  return (
    <span className="gd-drop">
      <Bar w={w} h={6} tone={4} />
      <Sym n="keyboard_arrow_down" size={14} />
    </span>
  )
}

function Sym({ n, size = 20, style }: { n: keyof typeof P; size?: number; style?: CSSProperties }) {
  return (
    <svg className="gd-sym" width={size} height={size} viewBox="0 -960 960 960" style={style} aria-hidden>
      <path d={P[n]} fill="currentColor" />
    </svg>
  )
}

// Material Symbols (Outlined, weight 400), Google's own icon set for Docs.
// Path data from @material-symbols/svg-400, Apache 2.0. viewBox 0 -960 960 960.
const P = {
  'add_comment': 'M450-400h60v-130h130v-60H510v-130h-60v130H320v60h130v130ZM80-80v-740q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240L80-80Zm134-220h606v-520H140v600l74-80Zm-74 0v-520 520Z',
  'add_photo_alternate': 'M480-480ZM180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h365v60H180v600h600v-365h60v365q0 24-18 42t-42 18H180Zm60-162h480L576-474 449-307l-94-124-115 149Zm453-323v-87h-88v-60h88v-88h60v88h87v60h-87v87h-60Z',
  'add_reaction': 'M480-480Zm.27 400q-82.74 0-155.5-31.5Q252-143 197.5-197.5t-86-127.27Q80-397.53 80-480.27 80-563 111.6-636q31.6-73 85.77-127 54.17-54 127.4-85.5T480-880q45.8 0 88.4 10 42.6 10 81.6 28v67q-38-22-80.5-33.5T480.22-820q-141.4 0-240.81 99T140-480.49q0 141.52 99.49 241 99.48 99.49 241 99.49Q622-140 721-239.34q99-99.35 99-240.66 0-34.78-6.5-67.39T794-610h64q11 31.42 16.5 63.37Q880-514.67 880-480q0 82-31.5 155.23-31.5 73.23-85.5 127.4T636-111.6Q563-80 480.27-80ZM810-680v-90h-90v-60h90v-90h60v90h90v60h-90v90h-60ZM626-533q22.5 0 38.25-15.75T680-587q0-22.5-15.75-38.25T626-641q-22.5 0-38.25 15.75T572-587q0 22.5 15.75 38.25T626-533Zm-292 0q22.5 0 38.25-15.75T388-587q0-22.5-15.75-38.25T334-641q-22.5 0-38.25 15.75T280-587q0 22.5 15.75 38.25T334-533Zm146 272q66 0 121.5-35.5T682-393H278q26 61 81 96.5T480-261Z',
  'chat': 'M240-399h313v-60H240v60Zm0-130h480v-60H240v60Zm0-130h480v-60H240v60ZM80-80v-740q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240L80-80Zm134-220h606v-520H140v600l74-80Zm-74 0v-520 520Z',
  'check': 'M378-246 154-470l43-43 181 181 384-384 43 43-427 427Z',
  'cloud_done': 'm412-279 230-230-40-40-189 189-100-100-41 41 140 140ZM251-160q-88 0-149.5-61.5T40-371q0-78 50-137t127-71q20-97 94-158.5T482-799q112 0 189 81.5T748-522v24q72-2 122 46.5T920-329q0 69-50 119t-119 50H251Zm0-60h500q45 0 77-32t32-77q0-45-32-77t-77-32h-63v-84q0-91-61-154t-149-63q-88 0-149.5 63T267-522h-19q-62 0-105 43.5T100-371q0 63 44 107t107 44Zm229-260Z',
  'drive_file_move': 'm526-410-75 75 42 42 147-147-147-147-42 42 75 75H320v60h206ZM140-160q-24 0-42-18.5T80-220v-520q0-23 18-41.5t42-18.5h281l60 60h339q23 0 41.5 18.5T880-680v460q0 23-18.5 41.5T820-160H140Zm0-60h680v-460H456l-60-60H140v520Zm0 0v-520 520Z',
  'edit': 'M180-180h44l472-471-44-44-472 471v44Zm-60 60v-128l575-574q8-8 19-12.5t23-4.5q11 0 22 4.5t20 12.5l44 44q9 9 13 20t4 22q0 11-4.5 22.5T823-694L248-120H120Zm659-617-41-41 41 41Zm-105 64-22-22 44 44-22-22Z',
  'format_align_left': 'M120-120v-60h720v60H120Zm0-165v-60h480v60H120Zm0-165v-60h720v60H120Zm0-165v-60h480v60H120Zm0-165v-60h720v60H120Z',
  'format_bold': 'M275-200v-560h228q66 0 114.5 42T666-612q0 38-21 70t-56 49v6q43 14 69.5 50t26.5 81q0 68-52.5 112T510-200H275Zm86-76h144q38 0 66-25t28-63q0-37-28-62t-66-25H361v175Zm0-247h136q35 0 60.5-23t25.5-58q0-35-25.5-58.5T497-686H361v163Z',
  'format_color_text': 'M80 0v-160h800V0H80Zm140-280 220-560h80l220 560h-75l-57-150H352l-57 150h-75Zm156-214h208L482-765h-4L376-494Z',
  'format_italic': 'M224-199v-80h134l139-409H338v-80h380v80H584L445-279h159v80H224Z',
  'format_list_bulleted': 'M377-198v-60h463v60H377Zm0-252v-60h463v60H377Zm0-253v-60h463v60H377ZM189-161q-28.05 0-48.02-19Q121-199 121-227.5t19.5-48q19.5-19.5 48-19.5t47.5 19.98q19 19.97 19 48.02 0 27.23-19.39 46.61Q216.23-161 189-161Zm0-252q-28.05 0-48.02-19.68Q121-452.36 121-480t19.98-47.32Q160.95-547 189-547q27.23 0 46.61 19.68Q255-507.64 255-480t-19.39 47.32Q216.23-413 189-413Zm-1-253q-27.64 0-47.32-19.68T121-733q0-27.64 19.68-47.32T188-800q27.64 0 47.32 19.68T255-733q0 27.64-19.68 47.32T188-666Z',
  'format_paint': 'M437-80q-24 0-42-17.63-18-17.62-18-42.37v-200H220q-24 0-42-18t-18-42v-303q0-55 39.66-96 39.65-41 95.34-41h505v440q0 24-18 42t-42 18H583v200q0 24.75-18 42.37Q547-80 523-80h-86ZM220-554h520v-226h-56v171h-60v-171h-71v85h-60v-85H295q-32 0-53.5 23T220-703v149Zm0 154h520v-94H220v94Zm0 0v-94 94Z',
  'format_underlined': 'M200-140v-60h560v60H200Zm280-140q-100 0-156.5-58.5T267-497v-343h83v343q0 63 34 101t96 38q62 0 96-38t34-101v-343h83v343q0 100-56.5 158.5T480-280Z',
  'history': 'M477-120q-149 0-253-105.5T120-481h60q0 125 86 213t211 88q127 0 215-89t88-216q0-124-89-209.5T477-780q-68 0-127.5 31T246-667h105v60H142v-208h60v106q52-61 123.5-96T477-840q75 0 141 28t115.5 76.5Q783-687 811.5-622T840-482q0 75-28.5 141t-78 115Q684-177 618-148.5T477-120Zm128-197L451-469v-214h60v189l137 134-43 43Z',
  'image': 'M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm0-60h600v-600H180v600Zm56-97h489L578-473 446-302l-93-127-117 152Zm-56 97v-600 600Z',
  'keyboard_arrow_down': 'M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z',
  'link': 'M450-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h170v60H280q-58.33 0-99.17 40.76-40.83 40.77-40.83 99Q140-422 180.83-381q40.84 41 99.17 41h170v60ZM325-450v-60h310v60H325Zm185 170v-60h170q58.33 0 99.17-40.76 40.83-40.77 40.83-99Q820-538 779.17-579q-40.84-41-99.17-41H510v-60h170q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H510Z',
  'lock_f': 'M220-80q-24.75 0-42.37-17.63Q160-115.25 160-140v-434q0-24.75 17.63-42.38Q195.25-634 220-634h70v-96q0-78.85 55.61-134.42Q401.21-920 480.11-920q78.89 0 134.39 55.58Q670-808.85 670-730v96h70q24.75 0 42.38 17.62Q800-598.75 800-574v434q0 24.75-17.62 42.37Q764.75-80 740-80H220Zm260.17-200q31.83 0 54.33-22.03T557-355q0-30-22.67-54.5t-54.5-24.5q-31.83 0-54.33 24.5t-22.5 55q0 30.5 22.67 52.5t54.5 22ZM350-634h260v-96q0-54.17-37.88-92.08-37.88-37.92-92-37.92T388-822.08q-38 37.91-38 92.08v96Z',
  'lock': 'M220-80q-24.75 0-42.37-17.63Q160-115.25 160-140v-434q0-24.75 17.63-42.38Q195.25-634 220-634h70v-96q0-78.85 55.61-134.42Q401.21-920 480.11-920q78.89 0 134.39 55.58Q670-808.85 670-730v96h70q24.75 0 42.38 17.62Q800-598.75 800-574v434q0 24.75-17.62 42.37Q764.75-80 740-80H220Zm0-60h520v-434H220v434Zm260.17-140q31.83 0 54.33-22.03T557-355q0-30-22.67-54.5t-54.5-24.5q-31.83 0-54.33 24.5t-22.5 55q0 30.5 22.67 52.5t54.5 22ZM350-634h260v-96q0-54.17-37.88-92.08-37.88-37.92-92-37.92T388-822.08q-38 37.91-38 92.08v96ZM220-140v-434 434Z',
  'menu': 'M120-240v-60h720v60H120Zm0-210v-60h720v60H120Zm0-210v-60h720v60H120Z',
  'more_vert': 'M479.86-160Q460-160 446-174.14t-14-34Q432-228 446.14-242t34-14Q500-256 514-241.86t14 34Q528-188 513.86-174t-34 14Zm0-272Q460-432 446-446.14t-14-34Q432-500 446.14-514t34-14Q500-528 514-513.86t14 34Q528-460 513.86-446t-34 14Zm0-272Q460-704 446-718.14t-14-34Q432-772 446.14-786t34-14Q500-800 514-785.86t14 34Q528-732 513.86-718t-34 14Z',
  'print': 'M658-648v-132H302v132h-60v-192h476v192h-60Zm-518 60h680-680Zm599 95q12 0 21-9t9-21q0-12-9-21t-21-9q-12 0-21 9t-9 21q0 12 9 21t21 9Zm-81 313v-192H302v192h356Zm60 60H242v-176H80v-246q0-45.05 30.5-75.53Q141-648 186-648h588q45.05 0 75.53 30.47Q880-587.05 880-542v246H718v176Zm102-236v-186.21Q820-562 806.78-575q-13.23-13-32.78-13H186q-19.55 0-32.77 13.22Q140-561.55 140-542v186h102v-76h476v76h102Z',
  'rate_review': 'M240-400h123l199.08-200q8.96-9 13.44-20.5Q580-632 580-643t-4-22q-4-11-13-20l-36.8-37.19Q517-731 506-735.5t-23-4.5q-11 0-22 4t-20.04 13L240-523v123Zm280-243-37-37 37 37ZM300-460v-38l102-101 19 18 18 19-101 102h-38Zm121-121 18 19-37-37 19 18Zm14 181h285v-60H495l-60 60ZM80-80v-740q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240L80-80Zm134-220h606v-520H140v600l74-80Zm-74 0v-520 520Z',
  'redo': 'M392-200q-95 0-163.5-64T160-422q0-94 68.5-158T392-644h294L572-758l42-42 186 186-186 186-42-42 114-114H391q-70 0-120.5 46.5T220-422q0 69 50.5 115.5T391-260h310v60H392Z',
  'search': 'M796-121 533-384q-30 26-69.96 40.5Q423.08-329 378-329q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l264 262-44 44ZM377-389q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z',
  'spellcheck': 'M563-80 404-239l42-42 117 117 240-240 42 42L563-80ZM120-312l200-527h66l200 527h-67l-54-142H238l-54 142h-64Zm137-200h189l-92-254h-5l-92 254Z',
  'star_f': 'm233-120 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z',
  'star': 'm323-245 157-94 157 95-42-178 138-120-182-16-71-168-71 167-182 16 138 120-42 178Zm-90 125 65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-355Z',
  'undo': 'M259-200v-60h310q70 0 120.5-46.5T740-422q0-69-50.5-115.5T569-584H274l114 114-42 42-186-186 186-186 42 42-114 114h294q95 0 163.5 64T800-422q0 94-68.5 158T568-200H259Z',
  'videocam': 'M140-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h520q24 0 42 18t18 42v215l160-160v410L720-435v215q0 24-18 42t-42 18H140Zm0-60h520v-520H140v520Zm0 0v-520 520Z',
} as const
