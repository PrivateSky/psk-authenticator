import ModalController from '../../cardinal/controllers/base-controllers/ModalController.js';
import {generateTOTPCode} from '../services/OTPService.js';

let otpAuth = /^otpauth:\/\/([a-zA-Z]{4})\/(.*)\?secret=(.*)&issuer=(.*)$/

let states = {
    SCAN_CODE: {
        buttonName: 'Next',
        importIsDisabled: true,
        codeWasSelected: true
    },
    COMPLETE_DETAILS: {
        buttonName: 'Import app',
        importIsDisabled: false,
        codeWasSelected: false
    }
}

let model = {
    title: 'Scan a QR Code',
    backupCode: {
        label: 'Your app provides a backup code? Store it here!',
        name: 'backupCode',
        placeholder: 'Backup code here...'
    },
    icon: {
        size: '30px',
        color: 'black',
        value: ''
    },
    authCode: '',
    data: '',
    pickedIcon: 'qrcode',
    seconds: 30,
    code: '',
    returnValue: {}
}


export default class ImportApplicationAuthController extends ModalController {
    constructor(element, history) {
        super(element, history);

        this.model = this.setModel(model);
        this.setFirstState();
        this.importSeedInputOnChange();
        this.iconValueOnChange();
        this.importOnClick();
    }

    iconValueOnChange() {
        this.model.onChange("icon", (value) => {
            let iconValue = this.model.icon.value;
            let iconValueLength = iconValue.length;
            if(iconValueLength > 3) {
                this.model.setChainValue('pickedIcon', iconValue);
            }
        })
    }

    setFirstState() {
        this.model.setChainValue('importButtonName', states.SCAN_CODE.buttonName);
        this.model.setChainValue('importIsDisabled', states.SCAN_CODE.importIsDisabled);
        this.model.setChainValue('codeWasSelected', states.SCAN_CODE.codeWasSelected);
    }

    setSecondState() {
        this.model.setChainValue('importButtonName', states.COMPLETE_DETAILS.buttonName);
        this.model.setChainValue('importIsDisabled', states.COMPLETE_DETAILS.importIsDisabled);
        this.model.setChainValue('codeWasSelected', states.COMPLETE_DETAILS.codeWasSelected);

        this.model.setChainValue('code', generateTOTPCode(this.model.appName, this.model.username, this.model.authCode, this.model.digits));

        setInterval(() => {
            this.model.setChainValue('code', generateTOTPCode(this.model.appName, this.model.username, this.model.authCode, this.model.digits));
            this.model.setChainValue('seconds', 30);
        }, 30000);

        setInterval(() => {
            this.model.setChainValue('seconds', (this.model.seconds - 1));
        }, 1000);
    }

    importSeedInputOnChange() {
        this.model.onChange("data", (value) => {
            let decodedData = decodeURIComponent(this.model.data);
            let matches = otpAuth.exec(decodedData);
            if (matches != null && matches.length === 5) {
                let username = matches[2];
                let codeGroup = matches[3].split('&digits=');
                let authCode = codeGroup[0];
                let digits = codeGroup.length === 2 ? parseInt(codeGroup[1]) : 6;
                let appName = matches[4];
                this.model.setChainValue('returnValue', {
                    username: username,
                    authCode: authCode,
                    digits: digits,
                    appName: appName
                });
                this.model.setChainValue('authCode', authCode);
                this.model.setChainValue('importIsDisabled', false);
            } else {
                this.model.setChainValue('importIsDisabled', true);
            }
        })
    }

    importOnClick() {
        this.on('import-on-click', (event) => {
            if (this.model.codeWasSelected) {
                this.setSecondState();
            } else {
                let backupCode = this.model.backupCode.value;
                let toBeReturned = {
                    ... this.model.returnValue,
                    backupCode: backupCode,
                    backupCodeDoesNotExist: (backupCode === undefined),
                    icon: this.model.pickedIcon
                }
                this._finishProcess(event, {value: toBeReturned});
            }
        });
    }

    _clean() {
        this.model.setChainValue('authCode', '');
        this.model.setChainValue('data', '');
        this.model.setChainValue('code', '');
        this.model.setChainValue('returnValue', {});
    }
    _finishProcess(event, response) {
        event.stopImmediatePropagation();
        this.responseCallback(undefined, response);
        this._clean();
    };
}
