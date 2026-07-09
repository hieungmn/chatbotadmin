export interface ExcelFaqItem {
    data_id: string;
    category?: string;
    question?: string;
    keywords?: string;
    answer_text: string;
    redirect_url?: string;
    is_draft?: boolean;
}