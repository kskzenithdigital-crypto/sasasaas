
import { COMPANY_NAME, COMPANY_ADDRESS, COMPANY_ADDRESS_2, COMPANY_PHONES, WARRANTY_TEXT } from '../constants';
import { Schedule, User } from '../types';

const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

/**
 * Gera a Ordem de Serviço Finalizada (OS)
 */
export const generatePDF = (schedule: Schedule, technician: User | undefined) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const content = `
    <html>
      <head>
        <title>Ordem de Serviço - ${COMPANY_NAME}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #0ea5e9; font-size: 24px; font-weight: 900; text-transform: uppercase; }
          .header p { margin: 3px 0; font-size: 11px; font-weight: bold; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; color: #0ea5e9; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .field { margin-bottom: 5px; font-size: 13px; }
          .label { font-weight: bold; color: #666; }
          .full-width { grid-column: span 2; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
          .warranty { background: #f0f9ff; border: 1px dashed #0ea5e9; padding: 12px; margin-top: 15px; border-radius: 8px; font-size: 12px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .signature-box { width: 45%; border-top: 1px solid #333; text-align: center; padding-top: 10px; font-size: 13px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${COMPANY_NAME}</h1>
          <p>${COMPANY_ADDRESS}</p>
          <p>${COMPANY_ADDRESS_2}</p>
          <p>${COMPANY_PHONES}</p>
          <p style="margin-top: 15px; font-size: 16px; border-top: 1px solid #eee; padding-top: 10px;">Ordem de Serviço #${schedule.id.slice(0, 8)}</p>
        </div>

        <div class="section">
          <div class="section-title">Dados do Cliente</div>
          <div class="grid">
            <div class="field"><span class="label">Nome:</span> ${schedule.clientName}</div>
            <div class="field"><span class="label">Telefone:</span> ${formatPhone(schedule.clientPhone)}</div>
            <div class="field full-width"><span class="label">Endereço:</span> ${schedule.clientAddress}, ${schedule.clientNumber || 'S/N'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Informações do Atendimento</div>
          <div class="grid">
            <div class="field"><span class="label">Data Agendada:</span> ${schedule.appointmentDate}</div>
            <div class="field"><span class="label">Data de Conclusão:</span> ${schedule.completionDate || '---'}</div>
            <div class="field"><span class="label">Técnico:</span> ${technician?.name || 'Não atribuído'}</div>
            <div class="field"><span class="label">Atendente:</span> ${schedule.attendantName}</div>
            <div class="field full-width"><span class="label">Descrição do Chamado:</span><br/>${schedule.description}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Relatório Técnico e Valores</div>
          <div class="field full-width" style="min-height: 80px; border: 1px solid #eee; padding: 15px; border-radius: 5px; background: #fafafa;">
            ${schedule.workDoneDescription || '<i>Serviço concluído.</i>'}
          </div>
          <div class="field" style="text-align: right; font-size: 20px; margin-top: 20px; font-weight: 900; color: #333;">
            <span class="label">TOTAL:</span> R$ ${schedule.finalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </div>
        </div>

        <div class="warranty">
          <strong>TERMO DE GARANTIA:</strong> ${WARRANTY_TEXT}
        </div>

        <div class="signatures">
          <div class="signature-box">Responsável Click Geomaqui</div>
          <div class="signature-box">Assinatura do Cliente</div>
        </div>

        <div class="footer">
          Gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </div>

        <div class="no-print" style="position: fixed; top: 20px; right: 20px;">
          <button onclick="window.print()" style="padding: 12px 24px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">IMPRIMIR PDF</button>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
};

/**
 * Gera um comprovante de agendamento (Tamanho 200x200mm)
 */
export const generateAppointmentReceipt = (schedule: Schedule, technician: User | undefined) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const content = `
    <html>
      <head>
        <title>Comprovante - ${COMPANY_NAME}</title>
        <style>
          @page { size: 200mm 200mm; margin: 0; }
          body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            padding: 0; 
            width: 200mm; 
            height: 200mm; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: #f8fafc;
          }
          .receipt-card {
            width: 180mm;
            height: 180mm;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            padding: 10mm;
            display: flex;
            flex-direction: column;
            border: 1px solid #e2e8f0;
            box-sizing: border-box;
          }
          .header { text-align: center; border-bottom: 3px solid #0ea5e9; padding-bottom: 5mm; margin-bottom: 8mm; }
          .header h1 { margin: 0; color: #0ea5e9; font-size: 22pt; font-weight: 900; }
          .header p { margin: 1mm 0; font-size: 9pt; color: #64748b; font-weight: 600; }
          .title { text-align: center; font-size: 14pt; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 8mm; background: #f1f5f9; padding: 3mm; border-radius: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-bottom: 8mm; }
          .info-item { border-bottom: 1px solid #f1f5f9; padding-bottom: 2mm; }
          .label { display: block; font-size: 8pt; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 1mm; }
          .value { font-size: 11pt; font-weight: 700; color: #1e293b; }
          .description { background: #f8fafc; padding: 5mm; border-radius: 10px; border: 1px solid #e2e8f0; flex-grow: 1; margin-bottom: 8mm; font-size: 10pt; color: #475569; }
          .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: auto; }
          .status { color: #059669; font-weight: 900; font-size: 10pt; text-align: center; margin-bottom: 5mm; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="header">
            <h1>${COMPANY_NAME}</h1>
            <p>${COMPANY_ADDRESS}</p>
            <p>${COMPANY_PHONES}</p>
          </div>

          <div class="title">Agendamento Confirmado</div>

          <div class="info-grid">
            <div class="info-item"><span class="label">Protocolo</span><span class="value">#${schedule.id.slice(0, 8).toUpperCase()}</span></div>
            <div class="info-item"><span class="label">Data Visita</span><span class="value">${schedule.appointmentDate}</span></div>
            <div class="info-item"><span class="label">Horário</span><span class="value">${schedule.appointmentTime}</span></div>
            <div class="info-item"><span class="label">Técnico</span><span class="value">${technician?.name || 'A definir'}</span></div>
          </div>

          <div class="info-item" style="margin-bottom: 5mm;"><span class="label">Cliente</span><span class="value">${schedule.clientName}</span></div>
          <div class="info-item" style="margin-bottom: 8mm;"><span class="label">Endereço</span><span class="value">${schedule.clientAddress}, ${schedule.clientNumber || 'S/N'}</span></div>

          <div class="label">Descrição do Defeito:</div>
          <div class="description">${schedule.description}</div>

          <div class="status">AGENDAMENTO REGISTRADO COM SUCESSO</div>

          <div class="footer">
            Gerado em ${new Date().toLocaleString('pt-BR')}
          </div>
        </div>

        <div class="no-print" style="position: fixed; bottom: 20px; width: 100%; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 30px; background: #0ea5e9; color: white; border: none; border-radius: 50px; cursor: pointer; font-weight: 900;">IMPRIMIR</button>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
};
