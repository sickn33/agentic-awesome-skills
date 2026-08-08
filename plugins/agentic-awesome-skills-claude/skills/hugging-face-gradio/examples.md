# Gradio End-to-End Examples

Complete working Gradio apps for reference.

## Blocks Essay Simple

```python
import gradio as gr

def change_textbox(choice):
    if choice == "short":
        return gr.Textbox(lines=2, visible=True)
    elif choice == "long":
        return gr.Textbox(lines=8, visible=True, value="Lorem ipsum dolor sit amet")
    else:
        return gr.Textbox(visible=False)

with gr.Blocks() as demo:
    radio = gr.Radio(
        ["short", "long", "none"], label="What kind of essay would you like to write?"
    )
    text = gr.Textbox(lines=2, interactive=True, buttons=["copy"])
    radio.change(fn=change_textbox, inputs=radio, outputs=text)

demo.launch()
```

## Blocks Flipper

```python
import numpy as np
import gradio as gr

def flip_text(x):
    return x[::-1]

def flip_image(x):
    return np.fliplr(x)

with gr.Blocks() as demo:
    gr.Markdown("Flip text or image files using this demo.")
    with gr.Tab("Flip Text"):
        text_input = gr.Textbox()
        text_output = gr.Textbox()
        text_button = gr.Button("Flip")
    with gr.Tab("Flip Image"):
        with gr.Row():
            image_input = gr.Image()
            image_output = gr.Image()
        image_button = gr.Button("Flip")

    with gr.Accordion("Open for More!", open=False):
        gr.Markdown("Look at me...")
        temp_slider = gr.Slider(
            0, 1,
            value=0.1,
            step=0.1,
            interactive=True,
            label="Slide me",
        )

    text_button.click(flip_text, inputs=text_input, outputs=text_output)
    image_button.click(flip_image, inputs=image_input, outputs=image_output)

demo.launch()
```

## Blocks Form

```python
import gradio as gr

with gr.Blocks() as demo:
    name_box = gr.Textbox(label="Name")
    age_box = gr.Number(label="Age", minimum=0, maximum=100)
    symptoms_box = gr.CheckboxGroup(["Cough", "Fever", "Runny Nose"])
    submit_btn = gr.Button("Submit")

    with gr.Column(visible=False) as output_col:
        diagnosis_box = gr.Textbox(label="Diagnosis")
        patient_summary_box = gr.Textbox(label="Patient Summary")

    def submit(name, age, symptoms):
        return {
            submit_btn: gr.Button(visible=False),
            output_col: gr.Column(visible=True),
            diagnosis_box: "covid" if "Cough" in symptoms else "flu",
            patient_summary_box: f"{name}, {age} y/o",
        }

    submit_btn.click(
        submit,
        [name_box, age_box, symptoms_box],
        [submit_btn, diagnosis_box, patient_summary_box, output_col],
    )

demo.launch()
```

## Blocks Hello

```python
import gradio as gr

def welcome(name):
    return f"Welcome to Gradio, {name}!"

with gr.Blocks() as demo:
    gr.Markdown(
    """
    # Hello World!
    Start typing below to see the output.
    """)
    inp = gr.Textbox(placeholder="What is your name?")
    out = gr.Textbox()
    inp.change(welcome, inp, out)

demo.launch()
```

## Blocks Layout

```python
import gradio as gr

demo = gr.Blocks()

with demo:
    with gr.Row():
        gr.Image(interactive=True, scale=2)
        gr.Image()
    with gr.Row():
        gr.Textbox(label="Text")
        gr.Number(label="Count", scale=2)
        gr.Radio(choices=["One", "Two"])
    with gr.Row():
        gr.Button("500", scale=0, min_width=500)
        gr.Button("A", scale=0)
        gr.Button("grow")
    with gr.Row():
        gr.Textbox()
        gr.Textbox()
        gr.Button()
    with gr.Row():
        with gr.Row():
            with gr.Column():
                gr.Textbox(label="Text")
                gr.Number(label="Count")
                gr.Radio(choices=["One", "Two"])
            gr.Image()
            with gr.Column():
                gr.Image(interactive=True)
                gr.Image()
    gr.Image()
    gr.Textbox(label="Text")
    gr.Number(label="Count")
    gr.Radio(choices=["One", "Two"])

demo.launch()
```

## Calculator

```python
import gradio as gr

def calculator(num1, operation, num2):
    if operation == "add":
        return num1 + num2
    elif operation == "subtract":
        return num1 - num2
    elif operation == "multiply":
        return num1 * num2
    elif operation == "divide":
        if num2 == 0:
            raise gr.Error("Cannot divide by zero!")
        return num1 / num2

demo = gr.Interface(
    calculator,
    [
        "number",
        gr.Radio(["add", "subtract", "multiply", "divide"]),
        "number"
    ],
    "number",
    examples=[
        [45, "add", 3],
        [3.14, "divide", 2],
        [144, "multiply", 2.5],
        [0, "subtract", 1.2],
    ],
    title="Toy Calculator",
    description="Here's a sample toy calculator.",
    api_name="predict"
)

demo.launch()
```

## Chatbot Simple

```python
import gradio as gr
import random
import time

with gr.Blocks() as demo:
    chatbot = gr.Chatbot()
    msg = gr.Textbox()
    clear = gr.ClearButton([msg, chatbot])

    def respond(message, chat_history):
        bot_message = random.choice(["How are you?", "Today is a great day", "I'm very hungry"])
        chat_history.append({"role": "user", "content": message})
        chat_history.append({"role": "assistant", "content": bot_message})
        time.sleep(2)
        return "", chat_history

    msg.submit(respond, [msg, chatbot], [msg, chatbot])

demo.launch()
```

## Chatbot Streaming

```python
import gradio as gr
import random
import time

with gr.Blocks() as demo:
    chatbot = gr.Chatbot()
    msg = gr.Textbox()
    clear = gr.Button("Clear")

    def user(user_message, history: list):
        return "", history + [{"role": "user", "content": user_message}]

    def bot(history: list):
        bot_message = random.choice(["How are you?", "I love you", "I'm very hungry"])
        history.append({"role": "assistant", "content": ""})
        for character in bot_message:
            history[-1]['content'] += character
            time.sleep(0.05)
            yield history

    msg.submit(user, [msg, chatbot], [msg, chatbot], queue=False).then(
        bot, chatbot, chatbot
    )
    clear.click(lambda: None, None, chatbot, queue=False)

demo.launch()
```

## Custom Css

```python
import gradio as gr

with gr.Blocks() as demo:
    with gr.Column(elem_classes="cool-col"):
        gr.Markdown("### Gradio Demo with Custom CSS", elem_classes="darktest")
        gr.Markdown(
            elem_classes="markdown",
            value="Resize the browser window to see the CSS media query in action.",
        )

if __name__ == "__main__":
    demo.launch(css_paths=["demo/custom_css/custom_css.css"])
```

## Fake Diffusion

```python
import gradio as gr
import numpy as np
import time

def fake_diffusion(steps):
    rng = np.random.default_rng()
    for i in range(steps):
        time.sleep(1)
        image = rng.random(size=(600, 600, 3))
        yield image
    image = np.ones((1000,1000,3), np.uint8)
    image[:] = [255, 124, 0]
    yield image

demo = gr.Interface(fake_diffusion,
                    inputs=gr.Slider(1, 10, 3, step=1),
                    outputs="image",
                    api_name="predict")

demo.launch()
```

## Hello World

```python
import gradio as gr


def greet(name):
    return "Hello " + name + "!"


demo = gr.Interface(fn=greet, inputs="textbox", outputs="textbox", api_name="predict")

demo.launch()
```

## Image Editor

```python
import gradio as gr
import time


def sleep(im):
    time.sleep(5)
    return [im["background"], im["layers"][0], im["layers"][1], im["composite"]]


def predict(im):
    return im["composite"]


with gr.Blocks() as demo:
    with gr.Row():
        im = gr.ImageEditor(
            type="numpy",
        )
        im_preview = gr.Image()
    n_upload = gr.Number(0, label="Number of upload events", step=1)
    n_change = gr.Number(0, label="Number of change events", step=1)
    n_input = gr.Number(0, label="Number of input events", step=1)

    im.upload(lambda x: x + 1, outputs=n_upload, inputs=n_upload)
    im.change(lambda x: x + 1, outputs=n_change, inputs=n_change)
    im.input(lambda x: x + 1, outputs=n_input, inputs=n_input)
    im.change(predict, outputs=im_preview, inputs=im, show_progress="hidden")

demo.launch()
```

## On Listener Decorator

```python
import gradio as gr

with gr.Blocks() as demo:
    name = gr.Textbox(label="Name")
    output = gr.Textbox(label="Output Box")
    greet_btn = gr.Button("Greet")

    @gr.on(triggers=[name.submit, greet_btn.click], inputs=name, outputs=output)
    def greet(name):
        return "Hello " + name + "!"

demo.launch()
```

## Render Merge

```python
import gradio as gr
import time

with gr.Blocks() as demo:
    text_count = gr.Slider(1, 5, value=1, step=1, label="Textbox Count")

    @gr.render(inputs=text_count)
    def render_count(count):
        boxes = []
        for i in range(count):
            box = gr.Textbox(label=f"Box {i}")
            boxes.append(box)

        def merge(*args):
            time.sleep(0.2)  # simulate a delay
            return " ".join(args)

        merge_btn.click(merge, boxes, output)

        def clear():
            time.sleep(0.2)  # simulate a delay
            return [" "] * count

        clear_btn.click(clear, None, boxes)

        def countup():
            time.sleep(0.2)  # simulate a delay
            return list(range(count))

        count_btn.click(countup, None, boxes, queue=False)

    with gr.Row():
        merge_btn = gr.Button("Merge")
        clear_btn = gr.Button("Clear")
        count_btn = gr.Button("Count")

    output = gr.Textbox()

demo.launch()
```

## Reverse Audio 2

```python
import gradio as gr
import numpy as np

def reverse_audio(audio):
    sr, data = audio
    return (sr, np.flipud(data))

demo = gr.Interface(fn=reverse_audio,
                    inputs="microphone",
                    outputs="audio", api_name="predict")

demo.launch()
```

## Sepia Filter

```python
import numpy as np
import gradio as gr

def sepia(input_img):
    sepia_filter = np.array([
        [0.393, 0.769, 0.189],
        [0.349, 0.686, 0.168],
        [0.272, 0.534, 0.131]
    ])
    sepia_img = input_img.dot(sepia_filter.T)
    sepia_img /= sepia_img.max()
    return sepia_img

demo = gr.Interface(sepia, gr.Image(), "image", api_name="predict")
demo.launch()
```

## Sort Records

```python
import gradio as gr

def sort_records(records):
    return records.sort("Quantity")

demo = gr.Interface(
    sort_records,
    gr.Dataframe(
        headers=["Item", "Quantity"],
        datatype=["str", "number"],  
        row_count=3,
        column_count=2,
        column_limits=(2, 2),
        type="polars"
    ),
    "dataframe",
    description="Sort by Quantity"
)

demo.launch()
```

## Streaming Simple

```python
import gradio as gr

with gr.Blocks() as demo:
    with gr.Row():
        with gr.Column():
            input_img = gr.Image(label="Input", sources="webcam")
        with gr.Column():
            output_img = gr.Image(label="Output")
        input_img.stream(lambda s: s, input_img, output_img, time_limit=15, stream_every=0.1, concurrency_limit=30)

if __name__ == "__main__":

    demo.launch()
```

## Tabbed Interface Lite

```python
import gradio as gr

hello_world = gr.Interface(lambda name: "Hello " + name, "text", "text", api_name="predict")
bye_world = gr.Interface(lambda name: "Bye " + name, "text", "text", api_name="predict")
chat = gr.ChatInterface(lambda *args: "Hello " + args[0], api_name="chat")

demo = gr.TabbedInterface([hello_world, bye_world, chat], ["Hello World", "Bye World", "Chat"])

demo.launch()
```

## Tax Calculator

```python
import gradio as gr

def tax_calculator(income, marital_status, assets):
    tax_brackets = [(10, 0), (25, 8), (60, 12), (120, 20), (250, 30)]
    total_deductible = sum(cost for cost, deductible in zip(assets["Cost"], assets["Deductible"]) if deductible)
    taxable_income = income - total_deductible

    total_tax = 0
    for bracket, rate in tax_brackets:
        if taxable_income > bracket:
            total_tax += (taxable_income - bracket) * rate / 100

    if marital_status == "Married":
        total_tax *= 0.75
    elif marital_status == "Divorced":
        total_tax *= 0.8

    return round(total_tax)

demo = gr.Interface(
    tax_calculator,
    [
        "number",
        gr.Radio(["Single", "Married", "Divorced"]),
        gr.Dataframe(
            headers=["Item", "Cost", "Deductible"],
            datatype=["str", "number", "bool"],  
            label="Assets Purchased this Year",
        ),
    ],
    gr.Number(label="Tax due"),
    examples=[
        [10000, "Married", [["Suit", 5000, True], ["Laptop (for work)", 800, False], ["Car", 1800, True]]],
        [80000, "Single", [["Suit", 800, True], ["Watch", 1800, True], ["Food", 800, True]]],
    ],
    live=True,
    api_name="predict"
)

demo.launch()
```

## Timer Simple

```python
import gradio as gr
import random
import time

with gr.Blocks() as demo:
  timer = gr.Timer(1)
  timestamp = gr.Number(label="Time")
  timer.tick(lambda: round(time.time()), outputs=timestamp, api_name="timestamp")

  number = gr.Number(lambda: random.randint(1, 10), every=timer, label="Random Number")
  with gr.Row():
    gr.Button("Start").click(lambda: gr.Timer(active=True), None, timer)
    gr.Button("Stop").click(lambda: gr.Timer(active=False), None, timer)
    gr.Button("Go Fast").click(lambda: 0.2, None, timer)

if __name__ == "__main__":
  demo.launch()
```

## Variable Outputs

```python
import gradio as gr

max_textboxes = 10

def variable_outputs(k):
    k = int(k)
    return [gr.Textbox(visible=True)]*k + [gr.Textbox(visible=False)]*(max_textboxes-k)

with gr.Blocks() as demo:
    s = gr.Slider(1, max_textboxes, value=max_textboxes, step=1, label="How many textboxes to show:")
    textboxes = []
    for i in range(max_textboxes):
        t = gr.Textbox(f"Textbox {i}")
        textboxes.append(t)

    s.change(variable_outputs, s, textboxes)

if __name__ == "__main__":
   demo.launch()
```

## Video Identity

```python
import gradio as gr
from gradio.media import get_video

def video_identity(video):
    return video

# get_video() returns file paths to sample media included with Gradio
demo = gr.Interface(video_identity,
                    gr.Video(),
                    "playable_video",
                    examples=[
                        get_video("world.mp4")
                    ],
                    cache_examples=True,
                    api_name="predict",)

demo.launch()
```
