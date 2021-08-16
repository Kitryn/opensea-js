import { ApiError } from "../../src/api/query-types";

describe("Error Types", () => {
  describe("ApiError", () => {
    it("Should create a new error", () => {
      const err = new ApiError("testMessage");
      expect(err instanceof ApiError).toBe(true);
      expect(err.name).toBe("ApiError");
      expect(err.data).toBeUndefined();
      expect(err.message).toBe("testMessage");
      expect(err.stack).toMatch(/ApiError: testMessage/);
    });

    it("Should assign stack and message if provided an existing error", () => {
      const _ = new Error("childMessage");
      const err = new ApiError(_.message, _.stack);
      expect(err.stack).toMatch(/Error: childMessage/);
      expect(err.stack).toMatch(/ApiError: childMessage/);
    });

    it("Should assign data", () => {
      const data = { testData: "123" };
      const err = new ApiError("testMessage", undefined, data);
      expect(err.stack).toMatch(/ApiError: testMessage/);
      expect(err.data).toBe(data);
    });
  });
});
