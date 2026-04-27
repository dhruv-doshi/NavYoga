import { isTTSAvailable, cancelSpeech } from "@/lib/tts";

describe("TTS", () => {
  let mockSpeechSynthesis: {
    cancel: jest.Mock;
  };

  beforeEach(() => {
    mockSpeechSynthesis = {
      cancel: jest.fn(),
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("isTTSAvailable", () => {
    it("should return true when speechSynthesis is available", () => {
      expect(isTTSAvailable()).toBe(true);
    });

    it("should return false when speechSynthesis is not available", () => {
      Object.defineProperty(window, "speechSynthesis", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isTTSAvailable()).toBe(false);
    });
  });

  describe("cancelSpeech", () => {
    it("should call speechSynthesis.cancel", () => {
      cancelSpeech();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it("should not throw when speechSynthesis is unavailable", () => {
      Object.defineProperty(window, "speechSynthesis", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(() => cancelSpeech()).not.toThrow();
    });
  });
});
