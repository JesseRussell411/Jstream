import fs from "fs/promises";
import { Tstream } from "../src/Tstream";

import { lazy } from "../src/privateUtils/functional";

export interface Customer {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    gender:
        | "Agender"
        | "Bigender"
        | "Female"
        | "Genderfluid"
        | "Genderqueer"
        | "Male"
        | "Non-binary"
        | "Polygender";
    ip_address: string;
    city: string;
    state: "AZ" | "MA" | "CA" | "NC" | "NY" | "MD" | "IN" | "FL" | "WA" | "VA" | "TN" | "MO" | "DC" | "LA" | "IA" | "SC" | "KS" | "GA" | "MI" | "DE" | "NV" | "TX" | "PA" | "CT" | "MT" | "MN" | "IL" | "OH" | "NJ" | "AK" | "KY" | "WV" | "WI" | "UT" | "CO" | "NE" | "ID" | "MS" | "OR" | "AL" | "NH" | "OK" | "ND" | "HI" | "NM" | "AR" | "RI" | "SD";
    security_enabled: boolean;
    profile_pic: string;
    company_name: string;
    bad_text: string;
}

export const getCustomers = lazy(async (): Promise<Tstream<Customer>> => {
    const data = await fs.readFile("./testData/customerData.json");
    const customers = JSON.parse(data.toString()) as any[];
    return Tstream.from(customers);
});
