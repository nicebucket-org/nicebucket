import dashboardPage from "./dashboard.page";

describe("Dashboard", () => {
  it("loads the application successfully", async () => {
    // Basic existence check - should pass if the HTML loads
    await expect($("#root")).toExist();

    await dashboardPage.login({
      region: "eu-central-1",
      endpoint: "http://localhost:4566",
      accessKeyId: "test",
      secretAccessKey: "test",
    });

    await dashboardPage.expectExactBuckets([
      "dashboard-bucket-one",
      "dashboard-bucket-two",
    ]);
  });
});
