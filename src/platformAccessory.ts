import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { TpLinkPowerlinePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class TpLinkPowerlinePlatformAccessory {
  private service: Service;

  constructor(
    private readonly platform: TpLinkPowerlinePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'TP-Link')
      .setCharacteristic(this.platform.Characteristic.ProductData, accessory.context.device.mac);

    if (accessory.context.config) {
      if (accessory.context.config.model) {
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
          .setCharacteristic(this.platform.Characteristic.Model, accessory.context.config.model);
      }

      if (accessory.context.config.serialNumber) {
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
          .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.config.serialNumber);
      }
    }

    this.accessory.category = this.platform.api.hap.Categories.RANGE_EXTENDER;

    // get the WiFi Satellite service if it exists, otherwise create a new WiFi Satellite service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.WiFiSatellite) ||
      this.accessory.addService(this.platform.Service.WiFiSatellite);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the Status Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.WiFiSatelliteStatus)
      .onGet(this.getStatus.bind(this)); // GET - bind to the `getStatus` method below

    /**
     * Updating characteristics values asynchronously.
     *
     * Here we update the status states every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    setInterval(async () => {
      try {
        const ping = await accessory.context.device.ping();
        const status = ping
          ? this.platform.Characteristic.WiFiSatelliteStatus.CONNECTED
          : this.platform.Characteristic.WiFiSatelliteStatus.NOT_CONNECTED;

        // push the new value to HomeKit
        this.service.updateCharacteristic(this.platform.Characteristic.WiFiSatelliteStatus, status);

        this.platform.log.debug('Updating status:', 'Connected');
      } catch (error) {
        this.platform.log.error(error);

        // push the new value to HomeKit
        this.service.updateCharacteristic(
          this.platform.Characteristic.WiFiSatelliteStatus,
          this.platform.Characteristic.WiFiSatelliteStatus.NOT_CONNECTED,
        );

        this.platform.log.debug('Updating status:', 'Not Connected');
      }
    }, 10000);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.
   */
  async getStatus(): Promise<CharacteristicValue> {
    let status = this.platform.Characteristic.WiFiSatelliteStatus.UNKNOWN;

    try {
      await this.accessory.context.device.ping();

      status = this.platform.Characteristic.WiFiSatelliteStatus.CONNECTED;

      this.platform.log.debug('Get Status ->', 'Connected');
    } catch (error) {
      this.platform.log.error(error);

      status = this.platform.Characteristic.WiFiSatelliteStatus.NOT_CONNECTED;

      this.platform.log.debug('Get Status ->', 'Not Connected');
    }

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return status;
  }

}
