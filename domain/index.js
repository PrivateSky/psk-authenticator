console.log("Loaded from domain.js");
const APPLICATIONS_MOUNTING_PATH = "/applications";
const keyssiresolver = require("opendsu").loadApi("resolver");

$$.swarms.describe('applicationsSwarm', {
    start: function (data) {
        if (rawDossier) {
            return this.createApplicationsDossier(data);
        }
        this.return(new Error("Raw Dossier is not available."));
    },

    createApplicationsDossier: function (data) {
        const keyssiSpace = require("opendsu").loadApi("keyssi");
        rawDossier.getKeySSI((err, ssi) => {
            if (err) {
                console.error(err);
                return this.return(err);
            }
            const templateSSI = keyssiSpace.buildSeedSSI(keyssiSpace.parse(ssi).getDLDomain());
            keyssiresolver.createDSU(templateSSI, (err, newDossier) => {
                if (err) {
                    console.error(err);
                    return this.return(err);
                }
                newDossier.writeFile('/data', JSON.stringify(data), (err, digest) => {
                    if (err) {
                        console.error(err);
                        return this.return(err);
                    }
                    newDossier.getKeySSI((err, keySSI) => {
                        if (err) {
                            return this.return(err);
                        }
                        this.mountDossier(rawDossier, APPLICATIONS_MOUNTING_PATH, keySSI)
                    });
                });
            });
        });
    },

    listApplications: function () {
        this.__listApplications((err, data) => {
            if (err) {
                return this.return(err);
            }
            this.return(err, data);
        });
    },

    __listApplications: function (callback) {
        rawDossier.readDir(APPLICATIONS_MOUNTING_PATH, (err, applications) => {
            if (err) {
                return callback(err);
            }
            let toBeReturned = [];

            let getApplicationData = (application) => {
                let appPath = APPLICATIONS_MOUNTING_PATH + '/' + application.path;
                rawDossier.readFile(appPath + '/data', (err, fileContent) => {
                    toBeReturned.push({
                        ...JSON.parse(fileContent),
                        path: appPath,
                        identifier: application.identifier
                    });
                    if (applications.length > 0) {
                        getApplicationData(applications.shift())
                    } else {
                        return callback(undefined, toBeReturned);
                    }
                });
            };
            if (applications.length > 0) {
                return getApplicationData(applications.shift());
            }
            return callback(undefined, toBeReturned);
        })
    },

    removeApplicationDossier(applicationPath) {
        rawDossier.unmount(applicationPath, (err, data) => {
            if (err) {
                return this.return(err);
            }
            return this.return(err, data);
        });
    },

    mountDossier: function (parentDossier, mountingPath, seed) {
        const PskCrypto = require("pskcrypto");
        const hexDigest = PskCrypto.pskHash(seed, "hex");
        let path = `${mountingPath}/${hexDigest}`;
        parentDossier.mount(path, seed, (err) => {
            if (err) {
                console.error(err);
                return this.return(err);
            }
            this.return(undefined, {path: path, seed: seed});
        });
    }
});