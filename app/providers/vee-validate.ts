import { defineRule, configure } from 'vee-validate';
import { required, min } from '@vee-validate/rules';

defineRule('required', required);
defineRule('min', min);

configure({
  validateOnInput: true,
});