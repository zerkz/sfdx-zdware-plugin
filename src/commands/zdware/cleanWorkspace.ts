import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('zdware-sfdx', 'org');

export default class Org extends SfdxCommand {

    public static description = messages.getMessage('commandDescription');

    public static examples = [
        `$ sfdx hello:org --targetusername myOrg@example.com --targetdevhubusername devhub@org.com
  Hello world! This is org: MyOrg and I will be around until Tue Mar 20 2018!
  My hub org id is: 00Dxx000000001234
  `,
        `$ sfdx hello:org --name myname --targetusername myOrg@example.com
  Hello myname! This is org: MyOrg and I will be around until Tue Mar 20 2018!
  `
    ];

    public static args = [{ name: 'file' }];

    protected static flagsConfig = {
        force: flags.boolean({ char: 'f', description: messages.getMessage('forceFlagDescription') })
    };

    // Comment this out if your command does not require an org username
    protected static requiresUsername = true;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = true;

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = false;

    public async run(): Promise<AnyJson> {
        const name = this.flags.name || 'world';

        // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
        const conn = this.org.getConnection();

        // The type we are querying for
        interface IDEWorkspace {
            Id: string;
            UserId: string;
        }

        interface User {
            Id: string;
        }

        const identityInfo = { orgId: this.org.getOrgId(), userName: this.org.getUsername() };

        // Query the org

        const userIdResult = await conn.query<User>(`select Id from User where UserName ='${this.org.getUsername()}' limit 1`);
        const ideWorkspaceResult = await conn.tooling.query<IDEWorkspace>(`select Id from IDEWorkspace where UserId = '${userIdResult.records[0].Id}'`);

        // Organization will always return one result, but this is an example of throwing an error
        // The output and --json will automatically be handled for you.
        if (!ideWorkspaceResult.records || ideWorkspaceResult.records.length <= 0) {
            this.ux.log(`No IDEWorkspace's found for ${this.org.getUsername()}`);
            return { ...identityInfo, deletedWorkspaces: 0 };
        }

        const outputString = `Number of IDEWorkspace's found for ${this.org.getUsername()}: ${ideWorkspaceResult.records.length}`;
        this.ux.log(outputString);
        if (!this.flags.force) {
            const confirmResponse = await this.ux.confirm('Do you want to delete all of your IDEWorkspace records?');
            if (!confirmResponse) {
                return { ...identityInfo, deletedWorkspaces: 0 };
            }
        }

        this.ux.log('Cleaning...');
        const deletionResult = await conn.tooling.sobject('IDEWorkspace').del(ideWorkspaceResult.records.map(x => x.Id));
        const errorsInResult = deletionResult.filter(x => x.success == false);
        errorsInResult.filter(x => x.success == false).forEach(x => {
            this.ux.error(`IDEWorkspace ${x.id} failed to delete.`);
            this.ux.errorJson(x.errors);
        });


        this.ux.log(`Cleaned ${deletionResult.length} workspaces.`);
        // Return an object to be displayed with --json
        return { orgId: this.org.getOrgId(), userName: this.org.getUsername(), deletedWorkspaces: deletionResult.length };
    }
}
