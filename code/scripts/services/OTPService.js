import * as OTPAuth from './otpauth.esm.min.js';

function generateTOTPCode(issuer = '', label = '', secret = '', digits = 6, period = 30) {
    return new OTPAuth.TOTP({
        issuer: issuer,
        label: label,
        algorithm: 'SHA1',
        digits: digits,
        period: period,
        secret: secret
    }).generate();
}

export {
    generateTOTPCode
}