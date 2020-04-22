use wasm_bindgen::prelude::wasm_bindgen;

use super::{Parser, ParseResult, ParsedValue, ParseError,
            ValueMode,
            LabelManager};

use crate::opcodes::{OPCODES_MAP, NONE as OPCODE_NONE};
use crate::assembler::AddressingMode;

//TODO: messages
use crate::alert;

#[wasm_bindgen]
pub struct Assembler {
    rom_offset: u16,
    identifiers: LabelManager,

    test_tmp: [u8; 30],
    offset: u16,
}

//public api
#[wasm_bindgen]
impl Assembler {
    #[wasm_bindgen(constructor)]
    pub fn new(rom_start: u16) -> Assembler {
        Assembler {
            rom_offset: rom_start,
            identifiers: LabelManager::new(),

            test_tmp: [0; 30],
            offset: 0,
        }
    }

    pub fn assemble(&mut self, prg: &str) -> *const u8 {
        let mut success = true;

        let mut lines = Parser::clean_input(prg);
        while let (_, Some(line)) = (success, lines.next()) {
            if Parser::is_macro(line) {
                success = self.macro_behaviour(line);
            } else if Parser::is_label(line) {
                success = self.label_behaviour(line);
            } else {
                success = self.instruction_behaviour(line);
            }
        }


        // write unordered labels
        let keys: Vec<String> = self.identifiers.map.keys()
            .map(|k| k.clone())
            .collect();

        for key in keys {
            let label = self.identifiers.map.remove_entry(&key).unwrap().1;

            if let Some(value) = label.value {
                let w_val = value as u8;
                for addr in label.usages_lo.iter() {
                    self.write_rom_at(w_val as u8, *addr);
                }

                let w_val = (value >> 8) as u8;
                for addr in &label.usages_hi {
                    self.write_rom_at(w_val, *addr)
                }
            } else {
                success = false;
            }
        }


        if success {
            &self.test_tmp[0] //get ptr
        } else {
            0 as *const u8
        }
    }
}

impl Assembler {
    #[inline(always)]
    fn macro_behaviour(&mut self, line: &str) -> bool {
        self.parse_macro(line).is_ok()
    }

    #[inline(always)]
    fn label_behaviour(&mut self, line: &str) -> bool {
        let name = &line[..line.len() - 1];


        if let Some(label) = self.identifiers.map.get_mut(name) {
            if let Some(_) = label.value {
                false
            } else {
                label.value = Some(self.rom_offset + self.offset);
                true
            }
        } else {
            self.identifiers.insert(name.into(), self.offset + self.rom_offset);
            true
        }
    }

    #[inline(always)]
    fn instruction_behaviour(&mut self, line: &str) -> bool {
        match self.parse_instruction(line) {
            Ok((opcode, addr)) => {
                self.write_rom(opcode);

                match addr.value() {
                    ValueMode::None => (),

                    ValueMode::U8(v) => self.write_rom(*v),

                    ValueMode::U16(v) => self.write_rom_u16(*v),

                    ValueMode::I8(offset) => {
                        let target = self.rom_offset.wrapping_add(*offset as u16) - 1;

                        self.write_rom_u16(target)
                    }

                    ValueMode::Label(name) => {
                        let data = self.identifiers.get_or_sched(name, self.offset);
                        if let Some(bytes) = data {
                            self.write_rom_u16(bytes);
                        } else {
                            self.offset += 2;
                        }
                    }

                    ValueMode::LabelLo(name) => {
                        let data = self.identifiers.get_or_sched_lo(name, self.offset);
                        if let Some(byte) = data {
                            self.write_rom(byte);
                        } else {
                            self.offset += 1;
                        }
                    }

                    ValueMode::LabelHi(name) => {
                        let data = self.identifiers.get_or_sched_hi(name, self.offset);
                        if let Some(byte) = data {
                            self.write_rom(byte);
                        } else {
                            self.offset += 1;
                        }
                    }
                }
                true
            }

            Err(e) => {
                alert(&format!("err {}", e as i32)); //TODO: REMOVE
                false
            }
        }
    }
}

//struct members so they can emit warnings
impl Assembler {
    #[inline(always)]
    fn write_rom_at(&mut self, byte: u8, addr: u16) { //TODO: safe
        self.test_tmp[addr as usize] = byte;
    }

    fn write_rom(&mut self, byte: u8) {
        self.write_rom_at(byte, self.offset);
        self.offset += 1
    }

    fn write_rom_u16(&mut self, bytes: u16) {
        self.write_rom(bytes as u8);
        self.write_rom((bytes >> 8) as u8);
    }

    fn parse_instruction(&mut self, line: &str) -> ParseResult<(u8, ParsedValue)> {
        let space_i = *line.find(' ').get_or_insert(line.len());
        let opcode = &line[..space_i];
        let data = *line.get((space_i + 1)..).get_or_insert("");

        let parsed_addr = self.parse_address(data)?;

        let opcode_val = OPCODES_MAP.get(opcode)
            .ok_or(ParseError::UnknownOpcode)?;

        let index = usize::from(parsed_addr.addr_mode());

        opcode_val.get(index)
            .ok_or(ParseError::UnknownOpcode)
            .and_then(|v| {
                if *v != OPCODE_NONE {
                    Ok((*v, parsed_addr))
                } else {
                    Err(ParseError::WrongAddressingMode)
                }
            })
    }


    fn parse_macro(&self, _line: &str) -> ParseResult<()> {
        Err(ParseError::UnknownMacro)
    }


    fn parse_address(&self, address: &str) -> ParseResult<ParsedValue> {
        if address.is_empty() || address == "A" { //accumulator
            Ok(
                ParsedValue::new(AddressingMode::Implicit, ValueMode::None, false)
            )
        } else {
            Parser::parse_addr_normal(address)
                .or_else(|err| {
                    if let ParseError::UnknownAddressingMode = err {
                        Parser::parse_addr_indexed(address)
                    } else {
                        Err(err)
                    }
                })
        }
    }
}

