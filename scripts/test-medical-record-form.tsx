/**
 * Upload stays disabled when files are chosen but the elder id is still blank.
 * Submit stays disabled when pasted text never reaches the button.
 * This mounts the real form buttons and drives them the way the page does.
 */
import { dom } from "./test-dom-setup";
import assert from "node:assert/strict";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { RecordAddForms } from "../components/dashboard/health-records/record-add-forms";
import { medicalUploadError } from "../lib/medical-record-file";
import {
  resolveRecordElderId,
  submitButtonDisabled,
  uploadButtonDisabled,
} from "../lib/medical-record-form";

function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === name);
  assert.ok(found, `missing button ${name}`);
  return found as HTMLButtonElement;
}

async function user(run: () => void) {
  await act(async () => {
    run();
  });
}

function setTextarea(area: HTMLTextAreaElement, value: string) {
  const tracked = area as HTMLTextAreaElement & { _valueTracker?: { setValue: (v: string) => void } };
  tracked._valueTracker?.setValue("\u0000");
  const proto = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value");
  proto?.set?.call(area, value);
  area.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  area.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}

function Harness({
  elderId,
  failUpload,
  failSave,
}: {
  elderId: string;
  failUpload?: boolean;
  failSave?: boolean;
}) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  async function upload(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (uploadButtonDisabled({ saving, fileCount: files.length, elderId })) return;
    setSaving(true);
    setMessage("");
    try {
      await Promise.resolve();
      if (failUpload) throw new Error("The upload service refused the file.");
      setMessage("saved");
      setFiles([]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveText(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (submitButtonDisabled({ saving, text, elderId })) return;
    setSaving(true);
    setMessage("");
    try {
      await Promise.resolve();
      if (failSave) throw new Error("The record service refused the text.");
      if (!text.trim()) throw new Error("empty");
      setMessage("saved");
      setText("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "failed");
    } finally {
      setSaving(false);
    }
  }

  return createElement(
    "div",
    null,
    createElement(
      "button",
      { type: "button", onClick: () => setMode(mode === "file" ? "text" : "file") },
      "switch",
    ),
    createElement(RecordAddForms, {
      mode,
      saving,
      files,
      text,
      elderId,
      onDragEnter: (e) => e.preventDefault(),
      onDragOver: (e) => e.preventDefault(),
      onDragLeave: (e) => e.preventDefault(),
      onDrop: (e) => {
        e.preventDefault();
        setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
      },
      onPickFiles: (list) => setFiles(Array.from(list)),
      onRemoveFile: (file) => setFiles((prev) => prev.filter((f) => f !== file)),
      onText: setText,
      onUpload: (e) => void upload(e),
      onSaveText: (e) => void saveText(e),
    }),
    createElement("p", { id: "msg" }, message),
  );
}

async function main() {
  for (const file of [
    { name: "photo.jpg", type: "image/jpeg" },
    { name: "scan.png", type: "image/png" },
    { name: "page.heic", type: "image/heic" },
    { name: "lab.pdf", type: "application/pdf" },
  ]) {
    assert.equal(medicalUploadError({ name: file.name, size: 120, type: file.type }), null, file.name);
  }

  // One elder on the page, picker not rendered, chosen id still "".
  const hiddenElder = resolveRecordElderId({
    chosenRecipientId: "",
    recipientFilter: "all",
    recipientIds: ["elder-1"],
  });
  assert.equal(hiddenElder, "elder-1");
  assert.equal(uploadButtonDisabled({ saving: false, fileCount: 2, elderId: "" }), true);
  assert.equal(uploadButtonDisabled({ saving: false, fileCount: 2, elderId: hiddenElder }), false);
  assert.equal(submitButtonDisabled({ saving: false, text: "TSH 4.2", elderId: "" }), true);
  assert.equal(submitButtonDisabled({ saving: false, text: "TSH 4.2", elderId: hiddenElder }), false);
  assert.equal(submitButtonDisabled({ saving: false, text: "   ", elderId: hiddenElder }), true);
  assert.equal(
    resolveRecordElderId({
      chosenRecipientId: "",
      recipientFilter: "elder-2",
      recipientIds: ["elder-1", "elder-2"],
    }),
    "elder-2",
  );
  assert.equal(
    resolveRecordElderId({
      fixedRecipientUserId: "elder-9",
      chosenRecipientId: "",
      recipientFilter: "all",
      recipientIds: ["elder-1", "elder-2"],
    }),
    "elder-9",
  );
  assert.equal(
    resolveRecordElderId({
      chosenRecipientId: "",
      recipientFilter: "all",
      recipientIds: ["elder-1", "elder-2"],
    }),
    "",
  );

  const rootEl = document.getElementById("root")!;
  const root = createRoot(rootEl);
  await act(async () => {
    root.render(createElement(Harness, { elderId: hiddenElder }));
  });

  assert.equal(button("Upload").disabled, true);

  const input = document.querySelector("input[type=file]") as HTMLInputElement;
  const docs = [
    new File([Uint8Array.from([0xff, 0xd8, 0xff])], "photo.jpg", { type: "image/jpeg" }),
    new File([Uint8Array.from([0x89, 0x50])], "scan.png", { type: "image/png" }),
    new File(["heic"], "page.heic", { type: "image/heic" }),
    new File(["%PDF-1.4"], "lab.pdf", { type: "application/pdf" }),
  ];
  Object.defineProperty(input, "files", { configurable: true, value: docs });
  await user(() => input.dispatchEvent(new dom.window.Event("change", { bubbles: true })));

  const upload = button("Upload 4 files");
  assert.equal(upload.disabled, false, "jpg, png, heic, and pdf must enable Upload");

  await act(async () => {
    root.render(createElement(Harness, { elderId: "" }));
  });
  assert.equal(button("Upload 4 files").disabled, true, "files without an elder must stay disabled");

  await act(async () => {
    root.render(createElement(Harness, { elderId: hiddenElder }));
  });
  assert.equal(button("Upload 4 files").disabled, false);

  for (let i = 0; i < docs.length; i += 1) {
    await user(() => button("Remove").click());
  }
  assert.equal(button("Upload").disabled, true, "clearing the selection disables Upload");

  Object.defineProperty(input, "files", { configurable: true, value: [docs[0], docs[3]] });
  await user(() => input.dispatchEvent(new dom.window.Event("change", { bubbles: true })));
  await act(async () => {
    root.render(createElement(Harness, { elderId: hiddenElder, failUpload: true }));
  });
  await act(async () => {
    button("Upload 2 files").click();
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.match(document.getElementById("msg")?.textContent || "", /refused/);
  assert.equal(button("Upload 2 files").disabled, false, "a failed upload must leave Upload enabled");

  await user(() => button("switch").click());
  assert.equal(button("Submit").disabled, true);

  const area = document.querySelector("textarea") as HTMLTextAreaElement;
  assert.ok(area, "paste box");
  await user(() => setTextarea(area, "TSH 4.2 mIU/L"));
  assert.equal(button("Submit").disabled, false, "pasted text must enable Submit");

  await user(() => setTextarea(area, "   "));
  assert.equal(button("Submit").disabled, true, "blank paste must keep Submit disabled");

  await user(() => setTextarea(area, "HbA1c 6.4%"));
  await act(async () => {
    root.render(createElement(Harness, { elderId: hiddenElder, failSave: true }));
  });
  assert.equal(button("Submit").disabled, false);
  await act(async () => {
    button("Submit").click();
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.match(document.getElementById("msg")?.textContent || "", /refused the text/);
  assert.equal(button("Submit").disabled, false, "a failed save must leave Submit enabled");

  await act(async () => {
    root.unmount();
  });
  console.log("medical record form buttons passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
