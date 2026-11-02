import {
  Bar,
  Collapse,
  Field,
  Stage,
  States,
  Stream,
  Text,
  Window,
  type Act,
} from "../../kit";
import "./chat.css";

// An assistant answering in a desktop window. Beats: a question is typed into
// the composer and sent; it lands as the user's message; a short Thinking
// state; the answer streams in word by word; its sources arrive under it.
// Plays once; the still is the payoff.
//
// What makes streaming read:
// - Every word is laid out from the start (Stream), so the answer grows in
//   place: no line reflows, the window never jumps as text arrives.
// - The answer streams fast enough to feel like a model, slow enough to
//   read: about 25 words a second, a beat after Thinking.
// - The sent message carries what follows (Collapse with a drop reveal), so
//   the thread moves as one, and the composer empties as it sends.
// - The earlier turn is placeholder: the eye lands on the last exchange.
//
// Real strings: the question, the answer, the two sources, the placeholder.

const Q = "Why did checkout conversion drop last week?";
const A =
  "Conversion fell from 3.4% to 2.7% after the new address step went live on Tuesday. Mobile Safari accounts for most of the drop: the postcode field rejects spaces, so UK customers see an error and leave. Allowing spaces should recover most of it.";
const WORDS = A.split(" ").length;

type S = {
  draft: string;
  sent: boolean;
  phase: "idle" | "thinking" | "answer";
  words: number;
  sources: boolean;
};

const initial: S = {
  draft: "",
  sent: false,
  phase: "idle",
  words: 0,
  sources: false,
};
const poster: S = {
  draft: "",
  sent: true,
  phase: "answer",
  words: WORDS,
  sources: true,
};

async function script(a: Act<S>) {
  await a.wait(700);
  a.mark("type");
  await a.type("draft", Q, { interval: 38 });
  await a.wait(400);
  a.mark("send");
  a.put({ sent: true, draft: "" });
  await a.wait(450);
  a.put({ phase: "thinking" });
  await a.wait(1100);
  a.mark("stream");
  a.put({ phase: "answer" });
  for (let i = 1; i <= WORDS; i++) {
    a.put({ words: i });
    await a.wait(40);
  }
  await a.wait(300);
  a.mark("sources");
  a.put({ sources: true });
  await a.wait(2600);
}

export default function AiChat() {
  return (
    <Stage
      width={640}
      height={420}
      compact={{ below: 600, width: 358, height: 520 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      className="ac"
    >
      {(s) => (
        <Window title="Assistant" className="ac-win">
          <div className="ac-body">
            <div className="ac-thread">
              <div className="ac-turn ac-turn--past">
                <Bar w={180} h={30} r={15} tone={1} className="ac-past-q" />
                <Bar w="86%" h={8} r={4} tone={2} />
                <Bar w="62%" h={8} r={4} tone={2} />
              </div>
              <Collapse open={s.sent} reveal="drop" from="below">
                <div className="ac-q">
                  <Text>{Q}</Text>
                </div>
              </Collapse>
              {/* Thinking is one line; the answer opens to its own height as
                  Thinking closes, so the thread grows once, smoothly, and the
                  earlier turns move up with it. Before the send neither takes
                  any room */}
              <Collapse open={s.phase === 'thinking'}>
                <Text className="ac-thinking">Thinking</Text>
              </Collapse>
              <Collapse open={s.phase === 'answer'}>
                <div className="ac-a" data-on>
                  <Stream className="ac-stream" text={A} count={s.words} />
                  <div className="ac-sources" data-on={s.sources || undefined}>
                    <span className="ac-source">Checkout funnel, last 14 days</span>
                    <span className="ac-source">Errors by field</span>
                  </div>
                </div>
              </Collapse>
            </div>
            <Field
              className="ac-composer"
              value={s.draft}
              placeholder="Ask about your data"
              focused={!s.sent}
            />
          </div>
        </Window>
      )}
    </Stage>
  );
}
