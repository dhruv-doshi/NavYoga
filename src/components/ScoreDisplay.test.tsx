import React from "react";
import { render, screen } from "@testing-library/react";
import ScoreDisplay from "./ScoreDisplay";

describe("ScoreDisplay", () => {
  it("shows '—' when poseSelected is false", () => {
    render(<ScoreDisplay score={0} poseSelected={false} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows 'No pose' label when poseSelected is false", () => {
    render(<ScoreDisplay score={50} poseSelected={false} />);
    expect(screen.getByText("No pose")).toBeInTheDocument();
  });

  it("displays the score percentage when a pose is selected", () => {
    render(<ScoreDisplay score={75} poseSelected={true} />);
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("clamps score to 0 if a negative value is passed", () => {
    render(<ScoreDisplay score={-10} poseSelected={true} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("clamps score to 100 if a value above 100 is passed", () => {
    render(<ScoreDisplay score={110} poseSelected={true} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("shows 'Excellent' label at score >= 90", () => {
    render(<ScoreDisplay score={90} poseSelected={true} />);
    expect(screen.getByText("Excellent")).toBeInTheDocument();
  });

  it("shows 'Good' label at score in [75, 89]", () => {
    render(<ScoreDisplay score={75} poseSelected={true} />);
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("shows 'Fair' label at score in [55, 74]", () => {
    render(<ScoreDisplay score={55} poseSelected={true} />);
    expect(screen.getByText("Fair")).toBeInTheDocument();
  });

  it("shows 'Needs Work' label at score in [35, 54]", () => {
    render(<ScoreDisplay score={35} poseSelected={true} />);
    expect(screen.getByText("Needs Work")).toBeInTheDocument();
  });

  it("shows 'Off Pose' label at score below 35", () => {
    render(<ScoreDisplay score={10} poseSelected={true} />);
    expect(screen.getByText("Off Pose")).toBeInTheDocument();
  });

  it("shows 'All joints in target range' when score is 100", () => {
    render(<ScoreDisplay score={100} poseSelected={true} />);
    expect(screen.getByText("All joints in target range")).toBeInTheDocument();
  });

  it("shows percentage-of-joints sub-label when score < 100", () => {
    render(<ScoreDisplay score={60} poseSelected={true} />);
    expect(screen.getByText("60% of joints in target range")).toBeInTheDocument();
  });

  it("renders a progressbar with the correct aria-valuenow", () => {
    render(<ScoreDisplay score={42} poseSelected={true} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
  });

  it("progressbar aria-valuenow is 0 when score is clamped to 0", () => {
    render(<ScoreDisplay score={-5} poseSelected={true} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
