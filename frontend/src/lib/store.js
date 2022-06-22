import { Store } from "pullstate";
import { sortArray } from "../util/form";

const defaultUIState = {
  isLoggedIn: false,
  user: null,
  filters: {
    role: null,
  },
  language: {
    active: "en",
    langs: { en: "English", de: "German" },
  },
  administration: [],
  selectedAdministration: null,
  loadingAdministration: false,
  loadingMap: false,
  forms: window.forms.sort(sortArray),
  levels: window.levels,
  selectedForm: null,
  loadingForm: false,
  questionGroups: [],
  showAdvancedFilters: false,
  advancedFilters: [],
  administrationLevel: null,
};

const store = new Store(defaultUIState);

export default store;
