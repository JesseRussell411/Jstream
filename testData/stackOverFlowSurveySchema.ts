import csv from "csv-parse/sync";
import fs from "fs/promises";
import Tstream from "../src/Tstream";

import { lazy } from "../src/privateUtils/functional";

export interface StackOverflowSurveySchemaEntry {
    qid: string;
    qname: string;
    question: string;
    force_resp: string;
    type: string;
    selector: string;
}

export const getStackOverflowSurveySchema = lazy(
    async (): Promise<Tstream<StackOverflowSurveySchemaEntry>> => {
        const data = await fs.readFile(
            "./testData/stack overflow survey/survey_results_schema.csv"
        );
        const parsedData: string[][] = csv.parse(data);
        return Tstream.from(parsedData)
            .skip(1)
            .map(e => {
                const record: Record<string, string> = {};
                e.forEach(
                    (value: string, i: number) =>
                        (record[parsedData[0][i]] = value)
                );
                return record;
            }) as any;
    }
);
