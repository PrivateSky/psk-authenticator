import DSUStorage from "../../cardinal/controllers/base-controllers/lib/DSUStorage.js";

class ApplicationsManagerService {

    constructor() {
        const HostBootScript = require("boot-host").HostBootScript;
        new HostBootScript("category-manager-service");
        this.DSUStorage = new DSUStorage();
    }

    addApplication(applicationDetails, callback) {
        $$.interaction.startSwarmAs("test/agent/007", "applicationsSwarm", "createApplicationsDossier", applicationDetails).onReturn(callback);
    }

    removeApplication(applicationPath, callback) {
        $$.interaction.startSwarmAs("test/agent/007", "applicationsSwarm", "removeApplicationDossier", applicationPath).onReturn(callback);
    }

    listApplications(callback) {
        $$.interaction.startSwarmAs("test/agent/007", "applicationsSwarm", "listApplications").onReturn(callback);
    }
}

let applicationsManagerService = new ApplicationsManagerService();
let getApplicationsManagerServiceInstance = function () {
    return applicationsManagerService;
}

export {
    getApplicationsManagerServiceInstance
};