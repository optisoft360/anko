import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
vi.mock("@material-tailwind/react", () => ({ Dialog: ({ open, children }) => (open ? <div>{children}</div> : null) }));

const service = vi.hoisted(() => ({ wsPullCard: vi.fn(), wsPushFeedback: vi.fn(), shuffleDeckCards: vi.fn() }));
vi.mock("@/services/projectService", () => ({ default: service }));

const { FlashcardLearnDialog, LEARN_RATINGS, NEXT_RATING } = await import("./flashcard-learn-dialog.jsx");

/** Fake scheduler: Good/Easy removes the card, Hard sends it to the back of the queue. */
function fakeDeck(ids) {
  const queue = [...ids];
  let seq = 0;
  service.wsPullCard.mockImplementation(async () => {
    if (!queue.length) return { message_type: "done" };
    seq += 1;
    return { message_type: "card", seq, kind: "new", card: { id: queue[0], front: `Q${queue[0]}`, back: `A${queue[0]}` } };
  });
  service.wsPushFeedback.mockImplementation(async ({ rating }) => {
    const id = queue.shift();
    if (rating === LEARN_RATINGS.HARD) queue.push(id);
    return { message_type: "ok" };
  });
}

const open = () => render(<FlashcardLearnDialog open deckId={1} deckTitle="Deck" onClose={() => {}} />);

describe("FlashcardLearnDialog", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("documents the scheduler scale and maps Next to Good", () => {
    expect(LEARN_RATINGS).toEqual({ HARD: 0, GOOD: 1, EASY: 2 });
    expect(NEXT_RATING).toBe(LEARN_RATINGS.GOOD);
  });

  it("walks 5 cards with Next/Good without repeating and ends the session", async () => {
    fakeDeck([1, 2, 3, 4, 5]);
    open();
    for (const id of [1, 2, 3, 4, 5]) {
      await screen.findAllByText(`Q${id}`);
      fireEvent.click(screen.getByText("Next"));
    }
    await screen.findByText("Session Complete!");
    const ratings = service.wsPushFeedback.mock.calls.map(([args]) => args.rating);
    expect(ratings).toEqual([1, 1, 1, 1, 1]);
    const seqs = service.wsPushFeedback.mock.calls.map(([args]) => args.seq);
    expect(seqs).toEqual([1, 2, 3, 4, 5]); // monotonic
  });

  it("re-shows a Hard card later and marks it as Review", async () => {
    fakeDeck([1, 2]);
    open();
    await screen.findAllByText("Q1");
    fireEvent.click(screen.getAllByText("Q1")[0]); // flip the card
    fireEvent.click(await screen.findByText("Hard"));
    await screen.findAllByText("Q2");
    expect(screen.queryByTestId("review-badge")).toBeNull();
    fireEvent.click(screen.getByText("Next"));
    await screen.findAllByText("Q1");
    await waitFor(() => expect(screen.getByTestId("review-badge")).toBeTruthy());
    expect(service.wsPushFeedback.mock.calls[0][0].rating).toBe(LEARN_RATINGS.HARD);
  });
});
