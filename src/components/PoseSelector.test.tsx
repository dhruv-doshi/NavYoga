import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PoseSelector from "./PoseSelector";
import type { PoseDefinition } from "@/lib/types";

const makePose = (id: string, name: string, difficulty: "beginner" | "intermediate" | "advanced" = "beginner"): PoseDefinition => ({
  id,
  name,
  sanskrit: `${name}asana`,
  description: "Test pose",
  difficulty,
  imageUrl: "/images/test.jpg",
  focus: [],
  angles: [],
});

const poses: PoseDefinition[] = [
  makePose("mountain", "Mountain Pose", "beginner"),
  makePose("warrior-1", "Warrior I", "beginner"),
  makePose("tree", "Tree Pose", "intermediate"),
];

describe("PoseSelector", () => {
  it("renders the trigger button with placeholder text when nothing is selected", () => {
    render(<PoseSelector poses={poses} selectedId={null} onSelect={jest.fn()} />);
    expect(screen.getByText("Select a pose to begin…")).toBeInTheDocument();
  });

  it("shows the selected pose name in the trigger when one is selected", () => {
    render(<PoseSelector poses={poses} selectedId="mountain" onSelect={jest.fn()} />);
    expect(screen.getByText("Mountain Pose")).toBeInTheDocument();
  });

  it("opens the dropdown when the trigger button is clicked", () => {
    render(<PoseSelector poses={poses} selectedId={null} onSelect={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Select a pose to begin/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("renders all poses in the dropdown after opening", () => {
    render(<PoseSelector poses={poses} selectedId={null} onSelect={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Select a pose to begin/i }));
    expect(screen.getByText("Mountain Pose")).toBeInTheDocument();
    expect(screen.getByText("Warrior I")).toBeInTheDocument();
    expect(screen.getByText("Tree Pose")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked pose and closes the dropdown", () => {
    const onSelect = jest.fn();
    render(<PoseSelector poses={poses} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Select a pose to begin/i }));
    fireEvent.click(screen.getByText("Mountain Pose"));
    expect(onSelect).toHaveBeenCalledWith(poses[0]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("calls onSelect(null) when the clear option is clicked", () => {
    const onSelect = jest.fn();
    render(<PoseSelector poses={poses} selectedId="mountain" onSelect={onSelect} />);
    // Open dropdown
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByText("— No pose selected"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("closes the dropdown when clicking outside", () => {
    render(<PoseSelector poses={poses} selectedId={null} onSelect={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Select a pose to begin/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows difficulty badge text for each pose", () => {
    render(<PoseSelector poses={poses} selectedId={null} onSelect={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Select a pose to begin/i }));
    const badges = screen.getAllByText(/beginner|intermediate|advanced/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("marks the selected pose option as aria-selected", () => {
    render(<PoseSelector poses={poses} selectedId="mountain" onSelect={jest.fn()} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    const options = screen.getAllByRole("option");
    const mountainOption = options.find(
      (o) => o.getAttribute("aria-selected") === "true" && o.textContent?.includes("Mountain Pose")
    );
    expect(mountainOption).toBeDefined();
  });
});
