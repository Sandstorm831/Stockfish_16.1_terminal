"use client";
import { useEffect, useRef, useState } from "react";

type stockfishState = "Loading" | "Ready" | "Waiting" | "Failed";

function wasmThreadsSupported() {
  // WebAssembly 1.0
  const source = Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);
  if (
    typeof WebAssembly !== "object" ||
    typeof WebAssembly.validate !== "function"
  )
    return false;
  if (!WebAssembly.validate(source)) return false;

  // SharedArrayBuffer
  if (typeof SharedArrayBuffer !== "function") return false;

  // Atomics
  if (typeof Atomics !== "object") return false;

  // Shared memory
  const mem = new WebAssembly.Memory({ shared: true, initial: 8, maximum: 16 });
  if (!(mem.buffer instanceof SharedArrayBuffer)) return false;

  // Structured cloning
  try {
    window.postMessage(mem, "*");
  } catch (e) {
    console.log(`Browser Error ${e}`);
    return false;
  }

  // Growable shared memory (optional)
  try {
    mem.grow(8);
  } catch (e) {
    console.log(`Browser Error ${e}`);
    return false;
  }

  return true;
}

export default function Home() {
  const [state, setState] = useState<stockfishState>("Waiting");
  const [stockfishResponse, setStockfishResponse] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [stockfishEngine, setStockfishEngine] = useState<object>();
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const latestEngine = useRef(stockfishEngine);
  const latestInputState = useRef(value);
  let output: string = "";
  const scrollToBottom = () => {
    if (autoScroll)
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  function postMessage(stockfishEngine: object | undefined) {
    if (!stockfishEngine) {
      console.log("engine is null");
      return;
    } else {
      // @ts-expect-error will contain a postMessage and stockfishEngine is vast enough to not to define it's type
      stockfishEngine.postMessage(latestInputState.current);
      setValue("");
      latestInputState.current = "";
    }
  }

  function handleEnter(event: KeyboardEvent) {
    if (event.key === "Enter") {
      postMessage(latestEngine.current);
    }
  }

  useEffect(() => {
    latestEngine.current = stockfishEngine;
  }, [stockfishEngine]);

  useEffect(() => {
    scrollToBottom();
  }, [stockfishResponse]);

  useEffect(() => {
    if (!wasmThreadsSupported()) {
      alert(
        "Web assembly threads are not supported in this browser, please update or switch the browser"
      );
      return;
    } else {
      const workd = new window.Worker(
        "/lib/stockfish-16.1.js#/lib/stockfish-16.1.wasm"
      );
      setState("Loading");
      workd.postMessage("isready");
      workd.onerror = function (error) {
        console.log(error);
        alert("Some error occured on the engine side, please try again");
      };
      workd.onmessage = function onmessage(event) {
        output += event.data + "\n";
        setStockfishResponse(output);
        if (state !== "Ready") {
          setState("Ready");
          document
            .querySelector("input")
            ?.addEventListener("keydown", handleEnter);
        }
      };
      setStockfishEngine(workd);
      return () => {
        workd.terminate();
        document
          .querySelector("input")
          ?.removeEventListener("keydown", handleEnter);
      };
    }
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#F7E7CE]">
      <div className="flex pt-5 pl-5 w-11/12 ">
        <input
          type="string"
          placeholder="Enter UCI Command Here"
          className={`w-5/6 border px-2 ${
            state === "Ready" ? "cursor-pointer" : "cursor-not-allowed"
          }`}
          onChange={(e) => {
            setValue(e.target.value);
            latestInputState.current = e.target.value;
          }}
          value={value}
          disabled={state === "Ready" ? false : true}
        />
        <button
          className={`bg-[#888888] text-white px-2 mr-5 ${
            state === "Ready" ? "cursor-pointer" : "cursor-not-allowed"
          }`}
          onClick={() => {
            if (!stockfishEngine) {
              console.log("Engine is null");
              return;
            }
            // @ts-expect-error will contain a postMessage and stockfishEngine is vast enough to not to define it's type
            stockfishEngine.postMessage(value);
            setValue("");
            latestInputState.current = "";
          }}
          disabled={state === "Ready" ? false : true}
        >
          SEND
        </button>
        <select
          className={`px-3 bg-white ${
            state === "Ready" ? "cursor-pointer" : "cursor-not-allowed"
          }`}
          disabled={state === "Ready" ? false : true}
        >
          <option>-- EXAMPLE --</option>
          <option value={"stop"} onClick={() => setValue("stop")}>
            stop
          </option>
          <option value={"isready"} onClick={() => setValue("isready")}>
            isready
          </option>
          <option value={"uci"} onClick={() => setValue("uci")}>
            uci
          </option>
          <option value={"go depth 15"} onClick={() => setValue("go depth 15")}>
            go depth 15
          </option>
          <option value={"eval"} onClick={() => setValue("eval")}>
            eval
          </option>
          <option value={"d"} onClick={() => setValue("d")}>
            d
          </option>
          <option
            value={"position startpos"}
            onClick={() => setValue("position startpos")}
          >
            position startpos
          </option>
          <option
            value={"setoption name Threads value 4"}
            onClick={() => setValue("setoption name Threads value 4")}
          >
            setoption name Threads value 4
          </option>
          <option
            value={"setoption name Threads value 1"}
            onClick={() => setValue("setoption name Threads value 1")}
          >
            setoption name Threads value 1
          </option>
          <option value={"go infinite"} onClick={() => setValue("go infinite")}>
            go infinite
          </option>
        </select>
      </div>
      <div className="pl-5 w-full flex font-mono whitespace-pre mt-3">
        - autoScroll :{" "}
        <div
          onClick={() => {
            setAutoScroll((x) => !x);
          }}
        >
          [{autoScroll ? "x" : " "}]
        </div>
      </div>
      <div className="pl-5 w-full mb-3 font-mono">
        - Stockfish 16.1 state : {state}
      </div>
      <div className="mx-5 mb-3 border flex-1 overflow-scroll whitespace-pre-wrap font-mono bg-white rounded-lg p-2">
        {stockfishResponse}
        <div ref={messagesEndRef}></div>
      </div>
    </div>
  );
}
