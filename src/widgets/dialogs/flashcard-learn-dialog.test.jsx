import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
vi.mock("@material-tailwind/react", () => ({ Dialog: ({ open, children }) => (open ? <div>{children}</div> : null) }));

const service = vi.hoisted(() => ({ learnStart: vi.fn(), learnAnswer: vi.fn() }));
vi.mock("@/services/projectService", () => ({ default: service }));

const { FlashcardLearnDialog, Rating } = await import("./flashcard-learn-dialog.jsx");

const card = (n, isReview = false) => ({ id: `c${n}`, card_id: `c${n}`, front: `Q${n}`, back: `A${n}`, is_review: isReview });

/** Fake API: each answer acknowledges its seq and returns the next card (null after `count`). */
function fakeApi(count = 5) {
  let shown = 1;
  service.learnStart.mockResolvedValue({ ack_seq: 0, next_card: card(1), session: { total: count, learned: 0 } });
  service.learnAnswer.mockImplementation(async ({ seq }) => {
    shown += 1;
    return { ack_seq: seq, next_card: shown <= count ? card(shown) : null, session: { total: count, learned: seq, done: shown > count } };
  });
}

const openDialog = () => render(<FlashcardLearnDialog open deckId={19} deckTitle="Deck" onClose={() => {}} />);
const flipAndRate = async (n, label) => {
  fireEvent.click(await screen.findByText("Next")); // Next only flips
  fireEvent.click(await screen.findByText(label));
};

describe("FlashcardLearnDialog", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("uses the FSRS scale: Hard sends 2 and Good sends 3", async () => {
    expect(Rating).toEqual({ Again: 1, Hard: 2, Good: 3, Easy: 4 });
    fakeApi(3);
    openDialog();
    await screen.findAllByText("Q1");
    await flipAndRate(1, "Hard");
    await screen.findAllByText("Q2");
    await flipAndRate(2, "Good");
    await screen.findAllByText("Q3");
    expect(service.learnAnswer.mock.calls.map(([a]) => a.rating)).toEqual([2, 3]);
  });

  it("Next only flips the card and sends nothing", async () => {
    fakeApi(2);
    openDialog();
    await screen.findAllByText("Q1");
    fireEvent.click(screen.getByText("Next"));
    await screen.findByText("Good");
    expect(service.learnAnswer).not.toHaveBeenCalled();
  });

  it("a fast double click on Good sends a single request", async () => {
    fakeApi(3);
    let release;
    service.learnAnswer.mockImplementationOnce(({ seq }) => new Promise((r) => { release = () => r({ ack_seq: seq, next_card: card(2), session: { total: 3, learned: 1 } }); }));
    openDialog();
    await screen.findAllByText("Q1");
    fireEvent.click(screen.getByText("Next"));
    const good = await screen.findByText("Good");
    fireEvent.click(good);
    fireEvent.click(good);
    expect(service.learnAnswer).toHaveBeenCalledTimes(1);
    await act(async () => release());
    await screen.findAllByText("Q2");
  });

  it("sends seq 1..5 for a 5-card session and shows the end screen on next_card null", async () => {
    fakeApi(5);
    openDialog();
    for (const n of [1, 2, 3, 4, 5]) {
      await screen.findAllByText(`Q${n}`);
      await flipAndRate(n, "Good");
    }
    await screen.findByText("Session Complete!");
    expect(screen.getByText("Repeat")).toBeTruthy();
    expect(screen.getByText("Close")).toBeTruthy();
    expect(service.learnAnswer.mock.calls.map(([a]) => a.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(service.learnAnswer.mock.calls.map(([a]) => a.rating)).toEqual([3, 3, 3, 3, 3]);
    expect(service.learnStart).toHaveBeenCalledTimes(1);
  });

  it("retries a network error with the same seq", async () => {
    fakeApi(3);
    service.learnAnswer.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    openDialog();
    await screen.findAllByText("Q1");
    await flipAndRate(1, "Good");
    await screen.findAllByText("Q2");
    expect(service.learnAnswer.mock.calls.map(([a]) => a.seq)).toEqual([1, 1]);
  });

  it("shows Review only when next_card.is_review is true", async () => {
    service.learnStart.mockResolvedValue({ ack_seq: 0, next_card: card(1), session: { total: 2, learned: 0 } });
    service.learnAnswer.mockResolvedValueOnce({ ack_seq: 1, next_card: card(1, true), session: { total: 2, learned: 0 } });
    openDialog();
    await screen.findAllByText("Q1");
    expect(screen.queryByTestId("review-badge")).toBeNull();
    await flipAndRate(1, "Again");
    await screen.findByTestId("review-badge");
  });

  it("every opening starts a new session (new job_id, seq back to 1)", async () => {
    fakeApi(3);
    const first = openDialog();
    await screen.findAllByText("Q1");
    first.unmount();
    fakeApi(3);
    openDialog();
    await screen.findAllByText("Q1");
    const [a, b] = service.learnStart.mock.calls.map(([args]) => args.jobId);
    expect(a).toBeTruthy();
    expect(b).not.toEqual(a);
    await flipAndRate(1, "Good");
    await screen.findAllByText("Q2");
    expect(service.learnAnswer.mock.calls[0][0]).toMatchObject({ jobId: b, seq: 1 });
  });
});
