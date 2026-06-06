"use client";

import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

interface ReceiptProps {
  receipt: {
    restaurantDetails: {
      name: string;
      address: string;
      contact: string;
    };
    orderDetails: {
      orderId: string;
      tableNumber: number | string;
      waiterName: string;
      type: string;
      date: string;
    };
    items: {
      id: string;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
    payment: {
      method: string;
      paymentId: string;
      confirmedBy: string;
    };
    summary: {
      subtotal: number;
      taxRate: number;
      taxAmount: number;
      grandTotal: number;
    };
  };
}

export function ReceiptGenerator({ receipt }: ReceiptProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm; /* Standard thermal receipt width */
            margin: 0;
            padding: 10px;
          }
        }
      `}} />
      
      <div 
        id="printable-receipt" 
        className="bg-white p-6 shadow-md w-full max-w-[320px] font-mono text-sm text-black mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-dashed border-black pb-4">
          <h2 className="text-xl font-bold uppercase mb-1">{receipt.restaurantDetails.name}</h2>
          <p className="text-xs">{receipt.restaurantDetails.address}</p>
          <p className="text-xs">{receipt.restaurantDetails.contact}</p>
        </div>

        {/* Order Info */}
        <div className="mb-4 text-xs space-y-1">
          <div className="flex justify-between">
            <span>Order No:</span>
            <span className="font-bold">{receipt.orderDetails.orderId.slice(-6).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{format(new Date(receipt.orderDetails.date), "dd/MM/yyyy HH:mm")}</span>
          </div>
          <div className="flex justify-between">
            <span>Table:</span>
            <span>{receipt.orderDetails.tableNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Waiter:</span>
            <span>{receipt.orderDetails.waiterName}</span>
          </div>
          <div className="flex justify-between">
            <span>Type:</span>
            <span>{receipt.orderDetails.type.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="border-b border-black mb-2"></div>

        {/* Items Header */}
        <div className="flex justify-between font-bold text-xs mb-2">
          <span className="w-1/2">Item</span>
          <span className="w-1/4 text-right">Qty</span>
          <span className="w-1/4 text-right">Amount</span>
        </div>

        {/* Items List */}
        <div className="space-y-2 mb-4">
          {receipt.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs">
              <span className="w-1/2 truncate">{item.name}</span>
              <span className="w-1/4 text-right">{item.quantity}</span>
              <span className="w-1/4 text-right">${item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-black pt-2 mb-4"></div>

        {/* Totals */}
        <div className="space-y-1 mb-4 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${receipt.summary.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({(receipt.summary.taxRate * 100).toFixed(0)}%)</span>
            <span>${receipt.summary.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-dashed border-black">
            <span>TOTAL</span>
            <span>${receipt.summary.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="mb-6 text-xs text-center border-t border-b border-dashed border-black py-2">
          <p>Paid via: <span className="font-bold">{receipt.payment.method}</span></p>
          <p className="text-[10px] mt-1 text-slate-500">Ref: {receipt.payment.paymentId.slice(-8)}</p>
        </div>

        {/* QR Code & Footer */}
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <QRCodeSVG 
              value={`https://futurelink.example.com/receipt/${receipt.orderDetails.orderId}`} 
              size={100}
              level="M"
              includeMargin={true}
            />
          </div>
          <p className="text-center text-[10px] font-bold">THANK YOU FOR YOUR VISIT!</p>
          <p className="text-center text-[10px]">Please come again.</p>
        </div>
      </div>
    </>
  );
}
