import ContainerController from '../../cardinal/controllers/base-controllers/ContainerController.js';
import {generateTOTPCode} from '../services/OTPService.js';
import {getApplicationsManagerServiceInstance} from "../services/ApplicationsManagerService.js";

export default class ViewAuthCodesController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.ApplicationsManagerService = getApplicationsManagerServiceInstance();
        this.model = this.setModel({
            codeRefreshSeconds: 30,
            secondRefreshSeconds: 1,
            window: 5,
            applications: [],
            workers: []
        });
        this._feedbackEmitterInit(element);
        this.populateApplications();
        this.importAppOnClick()
        this.copyToClipboardOnClick();
        this.backupButtonOnClick();
        this.triggerControlMenuOnClick();
        this.deleteAppOnClick();
    }

    copyToClipboardOnClick() {
        this.on('copy-to-clipboard-on-click', (event) => {

            let currentApp = event.data;
            let code = currentApp.code;
            if (currentApp.seconds < 6) {
                code = generateTOTPCode(currentApp.appName, currentApp.username, currentApp.authCode, currentApp.digits);
            }

            var dummy = document.createElement("textarea");
            document.body.appendChild(dummy);
            dummy.value = code;
            dummy.select();
            this._emitFeedback(event, 'Code copied successfully!', 'alert-success')
            document.execCommand("copy");
            document.body.removeChild(dummy);
        });
    }

    backupButtonOnClick() {
        this.on('backup-button-on-click', (event) => {
            let currentApp = event.data;
            if (currentApp.backupCodeDoesNotExist) {
                return;
            }
            let applications = this.model.applications;
            applications = applications.map(app => {
                return {
                    ... app,
                    backupCodeIsEnabled: false
                }
            })
            if(currentApp.backupCodeIsEnabled === false) {
                let appIndex = applications.findIndex(app => app.seed === currentApp.seed);
                applications = [
                    ...applications.slice(0, appIndex),
                    {
                        ...currentApp,
                        backupCodeIsEnabled: true
                    },
                    ...applications.slice(appIndex + 1),
                ]
            }
            this.setModelKey('applications', applications)
        });
    }

     triggerControlMenuOnClick() {
        this.on('trigger-control-menu', (event) => {
            let currentApp = event.data;
            let applications = this.model.applications;
            applications = applications.map(app => {
                return {
                    ... app,
                    controlMenuEnabled: false
                }
            })
            if(currentApp.controlMenuEnabled === false) {
                let appIndex = applications.findIndex(app => app.seed === currentApp.seed);
                applications = [
                    ...applications.slice(0, appIndex),
                    {
                        ...currentApp,
                        controlMenuEnabled: true
                    },
                    ...applications.slice(appIndex + 1),
                ]
            }
            this.setModelKey('applications', applications)
        });
    }

    deleteAppOnClick() {
        this.on('delete-app-on-click', (event) => {
            this._confirmActionModalHandler(event, (err, response) => {
                if (err || response.value === false) {
                    return;
                }
                this.ApplicationsManagerService.removeApplication(event.data.path, (err, data) => {
                    if (err) {
                        console.log(err);
                    }
                    this.populateApplications();
                    this._emitFeedback(event, 'Deleting was successfully!', 'alert-success')
                });
            });
        });
    }

    populateApplications() {
        this.model.workers.forEach(clearInterval)
        this.setModelKey('workers', [])
        this.ApplicationsManagerService.listApplications((err, applications) => {
            if (err) {
                console.log(err);
                return;
            }

            if (applications.length === -1) {
                applications.push({
                    username: 'username',
                    authCode: 'authCode',
                    digits: 6,
                    appName: 'appName',
                    seed: 'ckvbewikwe',
                    backupCode: 'blablabla',
                    backupCodeDoesNotExist: true,
                    icon: 'qrcode',
                    controlMenuEnabled: false
                })
                applications.push({
                    username: 'username',
                    authCode: 'authCode',
                    digits: 6,
                    appName: 'appName',
                    seed: 'ckvbegergerwikwe',
                    backupCodeDoesNotExist: true,
                    icon: 'qrcode',
                    controlMenuEnabled: false
                })
                applications.push({
                    username: 'username',
                    authCode: 'authCode',
                    digits: 6,
                    appName: 'appName',
                    seed: 'ckvgwrgebewikwe',
                    backupCodeDoesNotExist: true,
                    backupCode: 'blablabla',
                    icon: 'qrcode',
                    controlMenuEnabled: false
                })
                applications.push({
                    username: 'username',
                    authCode: 'authCode',
                    digits: 6,
                    appName: 'appName',
                    seed: 'ckvbewikerbrwe',
                    backupCodeDoesNotExist: true,
                    backupCode: 'blablabla',
                    icon: 'qrcode',
                    controlMenuEnabled: false
                })
            }


            applications = applications.map(app => {
                return {
                    ...app,
                    code: '',
                    seconds: '',
                    backupCodeDoesNotExist: (app.backupCode === undefined),
                    controlMenuEnabled: false,
                    backupCodeIsEnabled: false
                }
            })
            this.setModelKey('applications', applications)
            applications.forEach((app, index) => this.startWorker(app, index));
        });
    }

    addApplication(app) {
        this.ApplicationsManagerService.addApplication(app, (err, data) => {
            if (err) {
                console.log(err);
            }
            let applications = this.model.applications;
            app = {
                ...app,
                ...data
            }
            applications.push(app);
            this.setModelKey('applications', applications);
            this.startWorker(app, applications.length - 1)
        });
    }

    startWorker(code, index) {
        let globalThis = this;
        let codeRefreshSeconds = this.model.codeRefreshSeconds;
        let secondRefreshSeconds = this.model.secondRefreshSeconds;
        this.generateNewCode(globalThis, index, codeRefreshSeconds);

        let workers = this.model.workers;
        let workersLen = workers.length;
        workers[workersLen] = setInterval(() => {
            this.generateNewCode(globalThis, index, codeRefreshSeconds);
        }, codeRefreshSeconds * 1000);

        workers[workersLen + 1] = setInterval(() => {
            this.updateSecondsCounter(globalThis, index, secondRefreshSeconds);
        }, secondRefreshSeconds * 1000);
    }

    updateSecondsCounter(globalThis, index, secondRefreshSeconds) {
        let remainingSeconds = globalThis.model.applications[index].seconds;
        globalThis.model.applications[index].seconds = remainingSeconds - secondRefreshSeconds;
    }

    generateNewCode(globalThis, index, codeRefreshSeconds) {
        let app = globalThis.model.applications[index];
        globalThis.model.applications[index].code = generateTOTPCode(app.appName, app.username, app.authCode, app.digits);
        globalThis.model.applications[index].seconds = codeRefreshSeconds;
    }

    _feedbackEmitterInit(element) {
        this.feedbackEmitter = null;
        this.on('openFeedback', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.feedbackEmitter = e.detail;
        });
        element.addEventListener('validation-error', (e) => {
            const errorMessage = e.detail;
            this.feedbackEmitter(errorMessage, 'Validation Error', 'alert-danger');
        });
    }

    _emitFeedback(event, message, alertType) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (typeof this.feedbackEmitter === 'function') {
            this.feedbackEmitter(message, "Validation", alertType)
        }
    }

    _importQRCodeModalHandler(event, callback) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.showModal('importQRCodeModal', {}, callback);
    }

    importAppOnClick() {
        this.on('import-application', (event) => {
            this._importQRCodeModalHandler(event, (err, data) => {
                if (err || data === {}) {
                    this._emitFeedback(event, 'Importing failed!', 'alert-danger')
                    return;
                }
                this.addApplication(data.value);
                this._emitFeedback(event, 'Importing was successfully!', 'alert-success')
            });
        });
    }

    _confirmActionModalHandler(event, callback) {
        event.preventDefault();
        event.stopImmediatePropagation();
        let deletedApplication = event.data;

        let actionModalModel = {
            title: 'Are you sure?',
            description: 'Deleting the application named ' + deletedApplication.appName + ' is a non-reversible process. Think twice about it.',
            acceptButtonText: 'Yes, delete it',
            denyButtonText: 'No, go back',
        }

        this.showModal('confirmActionModal', actionModalModel, (err, response) => {
            if (err) {
                console.log(err);
            }
            callback(err, response);
        });
    }


    setModelKey(key, value) {
        this.model.setChainValue(key, JSON.parse(JSON.stringify(value)));
    }
}