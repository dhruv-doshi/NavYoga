import React from "react";
import { render, screen } from "@testing-library/react";
import FeedbackPanel from "./FeedbackPanel";
import type { FeedbackItem } from "@/lib/feedback";

const noItems: FeedbackItem[] = [];
const someItems: FeedbackItem[] = [
  { joint: "Left Knee", message: "Straighten your left knee", severity: "error" },
  { joint: "Right Hip", message: "Open your right hip more", severity: "error" },
];

describe("FeedbackPanel", () => {
  it("shows 'Select a target pose' message when poseSelected is false", () => {
    render(
      <FeedbackPanel
        items={noItems}
        headline=""
        poseSelected={false}
        poseDetected={false}
      />
    );
    expect(
      screen.getByText(/Select a target pose above/i)
    ).toBeInTheDocument();
  });

  it("shows 'Stand in the camera frame' when pose selected but not detected", () => {
    render(
      <FeedbackPanel
        items={noItems}
        headline=""
        poseSelected={true}
        poseDetected={false}
      />
    );
    expect(screen.getByText(/Stand in the camera frame/i)).toBeInTheDocument();
  });

  it("shows perfect alignment UI when pose detected with no corrections", () => {
    render(
      <FeedbackPanel
        items={noItems}
        headline="Perfect alignment!"
        poseSelected={true}
        poseDetected={true}
      />
    );
    expect(screen.getByText("Perfect alignment!")).toBeInTheDocument();
  });

  it("renders correction items when feedback is provided", () => {
    render(
      <FeedbackPanel
        items={someItems}
        headline="Getting there"
        poseSelected={true}
        poseDetected={true}
      />
    );
    expect(screen.getByText("Straighten your left knee")).toBeInTheDocument();
    expect(screen.getByText("Open your right hip more")).toBeInTheDocument();
  });

  it("renders the headline text when corrections exist", () => {
    render(
      <FeedbackPanel
        items={someItems}
        headline="Getting there — focus on the corrections below"
        poseSelected={true}
        poseDetected={true}
      />
    );
    expect(screen.getByText("Getting there — focus on the corrections below")).toBeInTheDocument();
  });

  it("renders joint label for each feedback item", () => {
    render(
      <FeedbackPanel
        items={someItems}
        headline=""
        poseSelected={true}
        poseDetected={true}
      />
    );
    expect(screen.getByText("Left Knee")).toBeInTheDocument();
    expect(screen.getByText("Right Hip")).toBeInTheDocument();
  });

  it("renders at most 4 items (controlled by parent)", () => {
    const manyItems: FeedbackItem[] = Array.from({ length: 4 }, (_, i) => ({
      joint: `Joint ${i}`,
      message: `Fix joint ${i}`,
      severity: "error" as const,
    }));
    render(
      <FeedbackPanel
        items={manyItems}
        headline=""
        poseSelected={true}
        poseDetected={true}
      />
    );
    const messages = manyItems.map((item) => screen.getByText(item.message));
    expect(messages).toHaveLength(4);
  });
});
