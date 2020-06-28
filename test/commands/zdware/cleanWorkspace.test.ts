import { expect, test } from '@salesforce/command/lib/test';
import { ensureJsonMap, ensureString } from '@salesforce/ts-types';

var testUsername = 'test@org.com';

describe('zdware:cleanWorkspace', () => {
  test
    .withOrg({ username: testUsername }, true)
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/IDEWorkspace/)) {
        return Promise.resolve({ records: [ { Name: 'Super Awesome Org', TrialExpirationDate: '2018-03-20T23:24:11.000+0000'}] });
      }
      return Promise.resolve({ records: [] });
    })
    .stdout()
    .command(['zdware:cleanWorkspace', '-f'])
    .it('runs zdware:cleanWorkspace --force', ctx => {
       expect(ctx.stdout).to.contain(`No IDEWorkspace's found for ${testUsername}`);
       return Promise.resolve();
    });
});
