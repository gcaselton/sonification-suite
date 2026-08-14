import { Layer } from "./layers";

export interface NavigationState {
    soniType?: string;
    dataName?: string | null;
    dataRef?: string | null;
    sourceDataRef?: string | null;
    styleRef?: string;
    styleName?: string;
    styleDescription?: string;
    ra?: number | null;
    dec?: number | null;
    userUpload?: boolean;
    editStyle?: string;
    layers?: Layer[];
    layerID?: string;
  }