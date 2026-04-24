import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Header from "./Header";

// Mock next/link and next/navigation
jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/"),
}));

import { usePathname } from "next/navigation";

describe("Header", () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/");
  });

  it("renders the brand name 'Asana'", () => {
    render(<Header />);
    expect(screen.getByText("Asana")).toBeInTheDocument();
  });

  it("renders all three nav links on desktop", () => {
    render(<Header />);
    expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Poses").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Practice").length).toBeGreaterThan(0);
  });

  it("nav links point to the correct hrefs", () => {
    render(<Header />);
    const homeLinks = screen.getAllByRole("link", { name: /Home/i });
    expect(homeLinks.some((l) => l.getAttribute("href") === "/")).toBe(true);
  });

  it("marks the active route link with aria-current='page'", () => {
    (usePathname as jest.Mock).mockReturnValue("/poses");
    render(<Header />);
    const posesLinks = screen.getAllByText("Poses");
    const activeLink = posesLinks.find(
      (el) => el.closest("a")?.getAttribute("aria-current") === "page"
    );
    expect(activeLink).toBeDefined();
  });

  it("does not mark inactive routes with aria-current", () => {
    (usePathname as jest.Mock).mockReturnValue("/poses");
    render(<Header />);
    const homeLinks = screen.getAllByText("Home");
    homeLinks.forEach((el) => {
      expect(el.closest("a")?.getAttribute("aria-current")).not.toBe("page");
    });
  });

  it("mobile menu is hidden by default", () => {
    render(<Header />);
    expect(screen.queryByRole("navigation", { name: /Mobile navigation/i })).not.toBeInTheDocument();
  });

  it("opens mobile menu when hamburger button is clicked", () => {
    render(<Header />);
    const hamburger = screen.getByRole("button", { name: /Open menu/i });
    fireEvent.click(hamburger);
    expect(screen.getByRole("navigation", { name: /Mobile navigation/i })).toBeInTheDocument();
  });

  it("closes mobile menu when hamburger is clicked again", () => {
    render(<Header />);
    const hamburger = screen.getByRole("button", { name: /Open menu/i });
    fireEvent.click(hamburger);
    fireEvent.click(screen.getByRole("button", { name: /Close menu/i }));
    expect(screen.queryByRole("navigation", { name: /Mobile navigation/i })).not.toBeInTheDocument();
  });

  it("has a skip-to-content accessible landmark via brand link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /Asana — home/i })).toBeInTheDocument();
  });
});
