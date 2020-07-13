const chai = require('chai');
const expect = chai.expect;
const fs = require('fs')
const sinon = require('sinon')

const envOne = require('../src/config');

const envConfigRaw = fs.readFileSync("test/.env.config", { encoding: "utf8" })
const envConfig = JSON.parse(envConfigRaw)
let mockGetProcessEnv;
let getProcessEnvStub
let readFileSyncStub

describe("should configure environment variables", () => {
  beforeEach((done) => {
    mockGetProcessEnv = { ENV: 'DEV' };
    readFileSyncStub = sinon.stub(fs, 'readFileSync').returns(envConfigRaw)
    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns(mockGetProcessEnv);
    done()
  });

  afterEach((done) => {
    readFileSyncStub.restore()
    getProcessEnvStub.restore();
    done()
  })

  it("should pick the config path from options", () => {
    const mockPath = 'test/.env.config'
    envOne.config({ path: mockPath })

    expect(readFileSyncStub.args[0][0]).is.equal(mockPath);
  })

  it("should pick the config path from options to enable logs", () => {
    const mockPath = 'test/.env.config'
    const consoleStub = sinon.stub(console, 'log')
    envOne.config({ path: mockPath })
    expect(consoleStub.called).not.ok;

    envOne.config({ path: mockPath, debug: true })
    expect(consoleStub.called).ok;
    consoleStub.restore()


  })


  it("should parse the environment variable", () => {
    const response = envOne.config()
    expect(response).haveOwnProperty("DB_CONNECTION_URL");
    expect(response.DB_CONNECTION_URL).is.not.null;
    expect(response.DB_CONNECTION_URL).is.not.equal(envConfig.DB_CONNECTION_URL);
    expect(response.DB_CONNECTION_URL).is.equal("https://service-xyz-DEV.xyx.mongo.com");
    expect(readFileSyncStub.callCount).is.equal(1);
  })

  it("should not change the plain text environment value without any dynamic configurations", () => {
    expect(envConfig.BFF_URL).is.equal("https://www.test-service.com/api/v1")
    const response = envOne.config()
    expect(response).haveOwnProperty("BFF_URL");
    expect(response.BFF_URL).is.not.null;
    expect(response.BFF_URL).is.equal(envConfig.BFF_URL);
    expect(readFileSyncStub.callCount).is.equal(1);
  })

  it("should pick correct environment variable based on the environment", () => {
    const response = envOne.config()
    expect(response).haveOwnProperty("TIME_OUT");
    expect(mockGetProcessEnv.ENV).is.equal("DEV")
    expect(response.TIME_OUT).is.not.null;
    expect(response.TIME_OUT).is.equal(envConfig.TIME_OUT.DEV);
  })

  it("should pick correct environment variable and replace configurations based on the environment", () => {
    let response = envOne.config()
    expect(response).haveOwnProperty("DB_CONNECTION_PASSWORD");
    expect(mockGetProcessEnv.ENV).is.equal("DEV")
    expect(response.DB_CONNECTION_PASSWORD).is.not.null;
    expect(response.DB_CONNECTION_PASSWORD).is.equal(envConfig.DB_CONNECTION_PASSWORD.DEV);

    mockGetProcessEnv = { ENV: "PROD" }
    getProcessEnvStub.restore(); // restore already wrapped function
    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns(mockGetProcessEnv);
    response = envOne.config()
    expect(response).haveOwnProperty("DB_CONNECTION_PASSWORD");
    expect(mockGetProcessEnv.ENV).is.equal("PROD")
    expect(response.DB_CONNECTION_PASSWORD).is.not.null;
    expect(response.DB_CONNECTION_PASSWORD).is.not.equal(envConfig.DB_CONNECTION_PASSWORD.PROD);
    expect(response.DB_CONNECTION_PASSWORD).is.equal("undefined");

    mockGetProcessEnv = { ENV: "PROD", DB_PASSWORD: "12345" }
    getProcessEnvStub.restore(); // restore already wrapped function
    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns(mockGetProcessEnv);
    response = envOne.config()
    expect(response).haveOwnProperty("DB_CONNECTION_PASSWORD");
    expect(mockGetProcessEnv.ENV).is.equal("PROD")
    expect(response.DB_CONNECTION_PASSWORD).is.not.null;
    expect(response.DB_CONNECTION_PASSWORD).is.not.equal(envConfig.DB_CONNECTION_PASSWORD.PROD);
    expect(response.DB_CONNECTION_PASSWORD).is.not.equal("undefined");
    expect(response.DB_CONNECTION_PASSWORD).is.equal("12345");
    getProcessEnvStub.restore();
  })

  it("should replace multiple configurations in single environnement variable", () => {
    let response = envOne.config()
    expect(response).haveOwnProperty("ANALYTICS_URL");
    expect(mockGetProcessEnv.ENV).is.equal("DEV")
    expect(response.ANALYTICS_URL).is.not.null;
    expect(response.ANALYTICS_URL).is.equal("https://DEV-analytics.undefined-albc.com");

    mockGetProcessEnv = { ENV: "PROD", SYSTEM: "rmt" }
    getProcessEnvStub.restore(); // restore already wrapped function
    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns(mockGetProcessEnv);
    response = envOne.config()
    expect(response).haveOwnProperty("ANALYTICS_URL");
    expect(mockGetProcessEnv.ENV).is.equal("PROD")
    expect(mockGetProcessEnv.SYSTEM).is.equal("rmt")
    expect(response.ANALYTICS_URL).is.not.null;
    expect(response.ANALYTICS_URL).is.not.equal("https://DEV-analytics.undefined-albc.com");
    expect(response.ANALYTICS_URL).is.not.equal("https://PROD-analytics.undefined-albc.com");
    expect(response.ANALYTICS_URL).is.equal("https://PROD-analytics.rmt-albc.com");
    getProcessEnvStub.restore();
  })

  it("should replace same configuration occurred multiple times in single environnement variable", () => {
    mockGetProcessEnv = { }
    getProcessEnvStub.restore(); // restore already wrapped function
    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns(mockGetProcessEnv);
    let response = envOne.config()
    expect(response).haveOwnProperty("LOG_URL");
    expect(mockGetProcessEnv.ENV).is.undefined;
    expect(response.LOG_URL).is.not.null;
    expect(response.LOG_URL).is.equal("https://undefined-abc.undefined-service.log-man.com");

    mockGetProcessEnv = { ENV: "PROD" }
    getProcessEnvStub.restore(); // restore already wrapped function
    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns(mockGetProcessEnv);
    response = envOne.config()
    expect(response).haveOwnProperty("LOG_URL");
    expect(mockGetProcessEnv.ENV).is.equal("PROD")
    expect(response.LOG_URL).is.not.null;
    expect(response.LOG_URL).is.not.equal("https://undefined-abc.undefined-service.log-man.com");
    expect(response.LOG_URL).is.not.equal("https://PROD-abc.undefined-service.log-man.com");
    expect(response.LOG_URL).is.not.equal("https://undefined-abc.PROD-service.log-man.com");
    expect(response.LOG_URL).is.equal("https://PROD-abc.PROD-service.log-man.com");
    getProcessEnvStub.restore();
  })

  it("should handle the errors in loading .env.config", () => {
    readFileSyncStub.restore(); // restore already wrapped function
    readFileSyncStub = sinon.stub(fs, 'readFileSync').throws(new Error("Error"));

    let response = envOne.config()
    expect(response).haveOwnProperty("error");  
    readFileSyncStub.restore();
  })

  it("should handle the errors in getting process Envs", () => {
    getProcessEnvStub.restore(); // restore already wrapped function
    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").throws(new Error("Error"));

    let response = envOne.config()
    expect(response).haveOwnProperty("error");  
    getProcessEnvStub.restore();
  })

  it("should pick the DEFAULT for un-defined environment configurations", () => {
    let response = envOne.config()
    expect(response).haveOwnProperty("CONTACT_US_EMAIL");
    expect(mockGetProcessEnv.ENV).is.equal("DEV")
    expect(response.CONTACT_US_EMAIL).is.not.null;
    expect(response.CONTACT_US_EMAIL).is.equal("hello-DEV@abcd.com");

    mockGetProcessEnv = { ENV: "STAG" }
    getProcessEnvStub.restore(); // restore already wrapped function
    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns(mockGetProcessEnv);
    response = envOne.config()
    expect(response).haveOwnProperty("CONTACT_US_EMAIL");
    expect(mockGetProcessEnv.ENV).is.equal("STAG")
    expect(response.CONTACT_US_EMAIL).is.not.null;
    expect(response.CONTACT_US_EMAIL).is.equal("hello-STAG@abcd.com");

    mockGetProcessEnv = { ENV: "PROD" }
    getProcessEnvStub.restore(); // restore already wrapped function
    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns(mockGetProcessEnv);
    response = envOne.config()
    expect(response).haveOwnProperty("CONTACT_US_EMAIL");
    expect(mockGetProcessEnv.ENV).is.equal("PROD")
    expect(response.CONTACT_US_EMAIL).is.not.null;
    expect(response.CONTACT_US_EMAIL).is.not.equal("hello-PROD@abcd.com");
    expect(response.CONTACT_US_EMAIL).is.equal("hello@abcd.com");
    getProcessEnvStub.restore();
  })

  it("should have error object if regex matcher throws any errors", () => {
    const matcherStub = sinon.stub(envOne, "matcher").throws(new Error("An error occurred"));
    let response = envOne.config()
    expect(response).haveOwnProperty("BFF_URL");
    expect(response.BFF_URL).is.not.null;
    expect(response.BFF_URL).haveOwnProperty("error");
    expect(response.BFF_URL.error).is.not.null;
    matcherStub.restore();
  })

  it("should configReplace return same value if the env value is null or not a string value", () => {
    let response = envOne.configReplace(undefined, "BFF_URL")
    expect(response).is.undefined;
    response = envOne.configReplace(null, "BFF_URL")
    expect(response).is.null;
    response = envOne.configReplace("", "BFF_URL")
    expect(response).is.equals("");
    response = envOne.configReplace(true, "BFF_URL")
    expect(response).is.true;

    const inputValue = [];
    response = envOne.configReplace(inputValue, "BFF_URL")
    expect(response).is.equals(inputValue);
  })
});

describe("should properly pass the process environments", () => {
  it("should return process environments", () => {
    expect(envOne.retrieveProcessEnv()).not.to.be.null;
  })

  it("should able to mock the responses", () => {
    let getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns(null);
    expect(envOne.retrieveProcessEnv()).to.be.null;
    getProcessEnvStub.restore(); // restore already wrapped function

    getProcessEnvStub = sinon.stub(envOne, "retrieveProcessEnv").returns({ ENV: "DEV" });
    expect(envOne.retrieveProcessEnv()).not.to.be.null;
    expect(envOne.retrieveProcessEnv()).haveOwnProperty("ENV");
    expect(envOne.retrieveProcessEnv().ENV).is.equal("DEV")
    getProcessEnvStub.restore(); // restore already wrapped function
  })
});