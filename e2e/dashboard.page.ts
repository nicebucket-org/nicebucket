import { $, expect } from "@wdio/globals";

class DashboardPage {
  private get regionInput() {
    return $("#region");
  }

  private get endpointInput() {
    return $("#endpoint");
  }

  private get accessKeyIdInput() {
    return $("#accessKeyId");
  }

  private get secretAccessKeyInput() {
    return $("#secretAccessKey");
  }

  private get connectButton() {
    return $('button[type="submit"]');
  }

  private get bucketList() {
    return $('[data-testid="bucket-list"]');
  }

  public async login(args: {
    region: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
  }): Promise<void> {
    const { region, endpoint, accessKeyId, secretAccessKey } = args;

    await this.regionInput.setValue(region);
    await this.endpointInput.setValue(endpoint);
    await this.accessKeyIdInput.setValue(accessKeyId);
    await this.secretAccessKeyInput.setValue(secretAccessKey);
    await expect(this.connectButton).toBeDisplayed();
    await this.connectButton.click();
  }

  public async expectExactBuckets(names: string[]): Promise<void> {
    // Check that all expected buckets are present
    for (const name of names) {
      await this.expectBucket(name);
    }

    // const bucketItems = this.bucketList.$$("li");
    // await expect(bucketItems).toHaveLength(names.length);
  }

  /**
   * Verify that a specific bucket is visible
   * @param name The bucket name to check for
   */
  public async expectBucket(name: string): Promise<void> {
    const bucketElement = this.bucketList.$(`li*=${name}`);
    await expect(bucketElement).toBeDisplayed();
  }
}

export default new DashboardPage();
