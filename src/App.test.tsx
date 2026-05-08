import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("renders project links and build metadata", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /shaderwave studio/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /star/i })).toHaveAttribute(
      "href",
      "https://github.com/baditaflorin/shaderwave-studio",
    );
    expect(screen.getByRole("link", { name: /support/i })).toHaveAttribute(
      "href",
      "https://www.paypal.com/paypalme/florinbadita",
    );
    expect(screen.getByText(/0.1.0-test/)).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
  });
});
