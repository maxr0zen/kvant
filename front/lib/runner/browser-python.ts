/**
 * Выполнение Python в браузере через Pyodide.
 * Работает только на клиенте (typeof window !== 'undefined').
 */

const PYODIDE_VERSION = "v0.29.3";
const PYODIDE_SCRIPT = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/pyodide.js`;
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full`;

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideNamespace>;
  }
}

interface PyodideNamespace {
  runPythonAsync(code: string): Promise<unknown>;
  globals: { set(key: string, value: string): void };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Не удалось загрузить Pyodide"));
    document.head.appendChild(s);
  });
}

let pyodidePromise: Promise<PyodideNamespace> | null = null;

export async function getPyodide(): Promise<PyodideNamespace> {
  if (typeof window === "undefined") {
    throw new Error("Pyodide работает только в браузере");
  }
  if (!pyodidePromise) {
    pyodidePromise = loadScript(PYODIDE_SCRIPT).then(async () => {
      const loadPyodide = window.loadPyodide;
      if (!loadPyodide) throw new Error("loadPyodide не найден");
      return loadPyodide({ indexURL: PYODIDE_INDEX });
    });
  }
  return pyodidePromise;
}

export interface RunPythonResult {
  stdout: string;
  stderr: string;
  error?: string;
}

/**
 * Выполняет код Python в браузере. stdin передаётся в программу как ввод.
 */
export async function runPythonInBrowser(
  code: string,
  stdin: string = ""
): Promise<RunPythonResult> {
  const pyodide = await getPyodide();
  pyodide.globals.set("_stdin_str", stdin);
  pyodide.globals.set("_user_code", code);

  const wrapper = `
from io import StringIO
import sys
_stdin = StringIO(_stdin_str)
sys.stdin = _stdin
_stdout = StringIO()
_old_stdout, _old_stderr = sys.stdout, sys.stderr
sys.stdout = sys.stderr = _stdout
try:
    exec(_user_code)
except Exception:
    import traceback
    traceback.print_exc(file=sys.stderr)
finally:
    sys.stdout, sys.stderr = _old_stdout, _old_stderr
_stdout.getvalue()
`;

  try {
    const result = await pyodide.runPythonAsync(wrapper);
    const stdout = result != null ? String(result) : "";
    return { stdout, stderr: "" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { stdout: "", stderr: "", error: message };
  }
}

/**
 * Нормализует вывод для сравнения с ожидаемым (концы строк, пробелы в конце).
 */
export function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, "\n").trimEnd();
}
