import * as handlebars from 'handlebars';

export type SetHelperFun = (
  name: string,
  fn: handlebars.HelperDelegate,
) => void;
export type SetPartialFun = (name: string, str: handlebars.Template) => void;

export class HandlebarsAPI {
  helpers: Record<string, handlebars.HelperDelegate> = {};

  partials: Record<string, handlebars.Template> = {};

  renderString(template: string, data: Record<string, string>) {
    const helpers: Record<string, handlebars.HelperDelegate> = {
      ...this.helpers,
    };
    const partials: Record<string, handlebars.Template> = {
      ...this.partials,
    };
    Object.keys(helpers).forEach(h => handlebars.registerHelper(h, helpers[h]));
    Object.keys(partials).forEach(p =>
      handlebars.registerPartial(p, partials[p]),
    );
    return handlebars.compile(template)(data) || '';
  }

  setHelper(name: string, fn: handlebars.HelperDelegate) {
    this.helpers[name] = fn;
  }

  setPartial(name: string, str: handlebars.Template) {
    this.partials[name] = str;
  }

  get method() {
    return {
      setHelper: this.setHelper.bind(this),
      setPartial: this.setPartial.bind(this),
    };
  }
}
